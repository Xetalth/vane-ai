"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import FlagList from "@/components/FlagList";
import TelemetryPanel from "@/components/TelemetryPanel";
import CodeContextViewer from "@/components/CodeContextViewer";
import AuditTrail from "@/components/AuditTrail";
import ImportFlagModal from "@/components/ImportFlagModal";
import { FeatureFlag, Organization, TelemetryData } from "@/types";

interface RemediationState {
  tier: "yellow" | "red" | "nominal";
  rootCause: string;
  reasoning: string;
  diff: string | null;
  appliedAt?: string;
}

export default function Home() {
  const [org, setOrg] = useState<Organization | null>({
    id: 1,
    name: "Acme Cloud",
    cluster_region: "US-East (Virginia)",
  });
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    errorRate: 0.04,
    p99Latency: 110,
    activeCrashes: 0,
    canarySample: "25.000 reqs",
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [remediation, setRemediation] = useState<RemediationState | null>(null);
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const loopRef = useRef<NodeJS.Timeout | null>(null);
  const currentRolloutRef = useRef<number>(5);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    if (selectedFlag) {
      currentRolloutRef.current = selectedFlag.rollout_percentage || 5;
    }
  }, [selectedFlag]);

  const fetchFlags = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/feature_flags`);
      if (res.ok) {
        const data: FeatureFlag[] = await res.json();
        setFlags(data);
        if (data.length > 0 && !selectedFlag) {
          setSelectedFlag(data[0]);
          currentRolloutRef.current = data[0].rollout_percentage || 5;
        } else if (selectedFlag) {
          const updated = data.find((f) => f.id === selectedFlag.id);
          if (updated) {
            setSelectedFlag(updated);
            currentRolloutRef.current = updated.rollout_percentage || 5;
          }
        }
      }
    } catch (err) {
      console.error("API Fetch Error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const stopSimulation = () => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setIsSimulating(false);
  };

  const triggerSimulation = async (type: "crash" | "latency" | "healthy") => {
    if (!selectedFlag) return;

    if (currentRolloutRef.current >= 100 && type !== "crash") {
      stopSimulation();
      return;
    }

    let payload = {
      feature_flag_id: selectedFlag.id,
      error_rate: 0.04,
      latency_p99: 115,
      crash_count: 0,
    };

    if (type === "crash") {
      payload = {
        feature_flag_id: selectedFlag.id,
        error_rate: 5.2,
        latency_p99: 720,
        crash_count: 94,
      };
      setTelemetry({
        errorRate: 5.2,
        p99Latency: 720,
        activeCrashes: 94,
        canarySample: "48.000 reqs",
      });
    } else if (type === "latency") {
      payload = {
        feature_flag_id: selectedFlag.id,
        error_rate: 0.95,
        latency_p99: 440,
        crash_count: 0,
      };
      setTelemetry({
        errorRate: 0.95,
        p99Latency: 440,
        activeCrashes: 0,
        canarySample: "36.000 reqs",
      });
    } else {
      setTelemetry({
        errorRate: 0.02,
        p99Latency: 95,
        activeCrashes: 0,
        canarySample: "55.000 reqs",
      });
    }

    try {
      const res = await fetch(`${apiUrl}/api/v1/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString();

      // 1. YELLOW TIER: AUTONOMOUS REMEDIATION
      if (data.tier === "yellow") {
        setRemediation({
          tier: "yellow",
          rootCause: data.root_cause,
          reasoning: data.reasoning,
          diff: data.diff,
          appliedAt: timeStr,
        });

        const nextRollout = Math.min(currentRolloutRef.current + 15, 100);
        currentRolloutRef.current = nextRollout;

        const patchedCode = (selectedFlag.code_context || "").replace(
          "scores = [compute_embedding(item) for item in item_pool]",
          "# Autonomous Hotfix Merged:\nscores = batch_compute_embeddings(item_pool, batch_size=64)"
        );

        setSelectedFlag((prev) => (prev ? { ...prev, rollout_percentage: nextRollout, code_context: patchedCode } : null));
        setFlags((prev) =>
          prev.map((f) => (f.id === selectedFlag.id ? { ...f, rollout_percentage: nextRollout, code_context: patchedCode } : f))
        );

        setLogs((prev) => [
          `[${timeStr}] ⚡ AUTONOMOUS_SELF_HEAL (Risk Score: ${data.risk_score}/100)\n` +
          `• Root Cause: ${data.root_cause}\n` +
          `• Remediation: ${data.reasoning}\n` +
          `• Autonomous Diff Applied:\n${data.diff}\n` +
          `✓ Canary progression continuing without downtime...`,
          ...prev,
        ]);

        setTimeout(() => {
          setTelemetry((t) => ({ ...t, p99Latency: 110, errorRate: 0.03 }));
        }, 1200);

        if (nextRollout >= 100) {
          stopSimulation();
          setLogs((prev) => [
            `[${timeStr}] 🏆 FULL_RELEASE: Flag successfully scaled to 100% rollout with zero downtime!`,
            ...prev,
          ]);
        }

      // 2. RED TIER: CRITICAL CIRCUIT BREAKER
      } else if (data.tier === "red") {
        stopSimulation();
        setRemediation({
          tier: "red",
          rootCause: data.root_cause,
          reasoning: data.reasoning,
          diff: data.diff,
          appliedAt: timeStr,
        });

        setLogs((prev) => [
          `[${timeStr}] 🚨 CRITICAL_GUARDRAIL_HOLD (Risk Score: ${data.risk_score}/100)\n` +
          `• Root Cause: ${data.root_cause}\n` +
          `• Guardrail Policy: ${data.reasoning}\n` +
          `! ALERT: Rollout halted. High-risk architectural change requires human engineer sign-off.`,
          ...prev,
        ]);

        setSelectedFlag((prev) => (prev ? { ...prev, status: "investigating" } : null));
        setFlags((prev) =>
          prev.map((f) => (f.id === selectedFlag.id ? { ...f, status: "investigating" } : f))
        );

      // 3. GREEN TIER: NOMINAL PROGRESSION
      } else {
        const nextRollout = Math.min(currentRolloutRef.current + 15, 100);
        currentRolloutRef.current = nextRollout;

        setSelectedFlag((prev) => (prev ? { ...prev, rollout_percentage: nextRollout, status: "canary" } : null));
        setFlags((prev) =>
          prev.map((f) => (f.id === selectedFlag.id ? { ...f, rollout_percentage: nextRollout, status: "canary" } : f))
        );

        setLogs((prev) => [
          `[${timeStr}] PROCEED_ROLLOUT (Risk Score: ${data.risk_score}/100): Telemetry healthy. Traffic scaled to ${nextRollout}%.`,
          ...prev,
        ]);

        if (nextRollout >= 100) {
          stopSimulation();
          setLogs((prev) => [
            `[${timeStr}] 🏆 FULL_RELEASE: Canary rollout successfully reached 100% target!`,
            ...prev,
          ]);
        }
      }
    } catch (err) {
      console.error("Simulation Execution Error:", err);
    }
  };

  const startSimulation = () => {
    if (!selectedFlag || (remediation && remediation.tier === "red")) return;
    if (currentRolloutRef.current >= 100) return;

    setIsSimulating(true);

    loopRef.current = setInterval(() => {
      if (currentRolloutRef.current >= 100) {
        stopSimulation();
        return;
      }

      const rand = Math.random();
      if (rand < 0.6) {
        triggerSimulation("healthy");
      } else if (rand < 0.9) {
        triggerSimulation("latency");
      } else {
        triggerSimulation("crash");
      }
    }, 4500);
  };

  const handleApproveCriticalPatch = () => {
    setIsApplyingPatch(true);
    setTimeout(() => {
      setIsApplyingPatch(false);

      const fixedCode = (selectedFlag?.code_context || "") + "\n// Safe bounds verification merged by engineer.";
      setSelectedFlag((prev) => (prev ? { ...prev, status: "canary", code_context: fixedCode } : null));
      setFlags((prev) =>
        prev.map((f) => (f.id === selectedFlag?.id ? { ...f, status: "canary", code_context: fixedCode } : f))
      );

      setRemediation((prev) => (prev ? { ...prev, tier: "nominal" } : null));
      setTelemetry({
        errorRate: 0.02,
        p99Latency: 105,
        activeCrashes: 0,
        canarySample: "30.000 reqs",
      });

      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ✓ CRITICAL_PATCH_APPROVED: Engineer approved patch. Hotfix deployed to production. Resuming canary rollout...`,
        ...prev,
      ]);

      startSimulation();
    }, 1500);
  };

  // Kırmızı Durumda Yamayı Reddetme & Flag'i Öldürme (Kill Switch)
  const handleRejectCriticalPatch = () => {
    stopSimulation();
    currentRolloutRef.current = 0;

    // Flag'i KILLED durumuna çek ve trafiği sıfırla
    setSelectedFlag((prev) => (prev ? { ...prev, status: "killed", rollout_percentage: 0 } : null));
    setFlags((prev) =>
      prev.map((f) => (f.id === selectedFlag?.id ? { ...f, status: "killed", rollout_percentage: 0 } : f))
    );

    setRemediation((prev) => (prev ? { ...prev, tier: "nominal", diff: null } : null));
    setTelemetry({
      errorRate: 0.0,
      p99Latency: 85,
      activeCrashes: 0,
      canarySample: "0 reqs (Traffic Isolated)",
    });

    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${timeStr}] 🛑 RELEASE_KILLED_BY_ENGINEER: AI remediation patch rejected.\n` +
      `• Action: Circuit breaker enforced. Traffic cut to 0%.\n` +
      `• Status: Flag '${selectedFlag?.key}' marked as KILLED.\n` +
      `• Jira/Incident: Escalated to engineering team for manual investigation.\n` +
      `$ vanectl flag kill ${selectedFlag?.key} --reason "AI patch rejected during critical failure"`,
      ...prev,
    ]);
  };

  const handleResetFlag = () => {
    if (!selectedFlag) return;
    currentRolloutRef.current = 5;
    setSelectedFlag((prev) => (prev ? { ...prev, status: "canary", rollout_percentage: 5 } : null));
    setFlags((prev) =>
      prev.map((f) => (f.id === selectedFlag.id ? { ...f, status: "canary", rollout_percentage: 5 } : f))
    );
    setTelemetry({
      errorRate: 0.04,
      p99Latency: 110,
      activeCrashes: 0,
      canarySample: "10.000 reqs",
    });
    setRemediation(null);
  };

  return (
    <div className="min-h-screen bg-[#04070c] text-slate-100 flex flex-col font-sans">
      <Navbar org={org} onRefresh={fetchFlags} isRefreshing={isRefreshing} />

      <div className="flex flex-1 overflow-hidden">
        <FlagList
          flags={flags}
          selectedFlag={selectedFlag}
          onSelect={(f) => {
            stopSimulation();
            setSelectedFlag(f);
            currentRolloutRef.current = f.rollout_percentage || 5;
            setRemediation(null);
          }}
          onOpenModal={() => setIsModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <TelemetryPanel
            flag={selectedFlag}
            telemetry={telemetry}
            isSimulating={isSimulating}
            onStartSimulation={startSimulation}
            onStopSimulation={stopSimulation}
            onResetFlag={handleResetFlag}
            onTriggerScenario={triggerSimulation}
          />

          <CodeContextViewer
            flag={selectedFlag}
            remediation={remediation}
            onApproveCriticalPatch={handleApproveCriticalPatch}
            onRejectCriticalPatch={handleRejectCriticalPatch}
            isApplying={isApplyingPatch}
          />

          <AuditTrail logs={logs} />
        </main>
      </div>

      <ImportFlagModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newFlag) => {
          setFlags((prev) => [newFlag, ...prev]);
          setSelectedFlag(newFlag);
          currentRolloutRef.current = newFlag.rollout_percentage || 5;
        }}
        organizationId={org?.id}
      />
    </div>
  );
}