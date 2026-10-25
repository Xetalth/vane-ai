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
  const [isSimulating, setIsSimulating] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentRolloutRef = useRef<number>(5);
  const isHaltedRef = useRef<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isHaltedRef.current = true;
    setIsSimulating(false);
  };

  // Çerezden GitHub token'ını okuma
  const getGithubToken = () => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; gh_token=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // SARI DURUM: Arka planda sessizce GitHub'a commit atan otonom fonksiyon
  const executeAutonomousBackgroundCommit = async (flagId: number, patchedCode: string) => {
    const token = getGithubToken();
    if (!token) return;

    try {
      await fetch(`${apiUrl}/api/v1/remediations/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Token": token,
        },
        body: JSON.stringify({
          feature_flag_id: flagId,
          file_path: "app/service.py",
          patched_code: patchedCode,
        }),
      });
    } catch (e) {
      console.error("Background commit error:", e);
    }
  };

  const scheduleNextTick = () => {
    if (isHaltedRef.current || currentRolloutRef.current >= 100) {
      stopSimulation();
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (isHaltedRef.current || currentRolloutRef.current >= 100) return;

      const rand = Math.random();
      let selectedType: "crash" | "latency" | "healthy" = "healthy";

      if (rand < 0.55) {
        selectedType = "healthy";
      } else if (rand < 0.8) {
        selectedType = "latency";
      } else {
        selectedType = "crash";
      }

      await triggerSimulation(selectedType);

      // Kırmızı devre kesici tetiklenmediyse akmaya devam et
      if (!isHaltedRef.current && currentRolloutRef.current < 100) {
        scheduleNextTick();
      }
    }, 4500);
  };

  const startSimulation = () => {
    if (!selectedFlag || (remediation && remediation.tier === "red")) return;
    if (currentRolloutRef.current >= 100) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    isHaltedRef.current = false;
    setIsSimulating(true);
    scheduleNextTick();
  };

  const triggerSimulation = async (type: "crash" | "latency" | "healthy") => {
    if (!selectedFlag || isHaltedRef.current) return;

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

      if (!res.ok) {
        throw new Error(`Simulation failed with status ${res.status}`);
      }

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString();

      // 1. SARI SEVİYE: OTONOM SELF-HEAL (İnsan onayı yok, ekrana yama kodu basılır, arka planda commit atılır)
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

        // Düzeltilmiş yeni kodu al
        const updatedCode = data.patched_code || selectedFlag.code_context;

        // Sol paneldeki canlı kodu hemen güncellenmiş kodla değiştir
        setSelectedFlag((prev) =>
          prev ? { ...prev, rollout_percentage: nextRollout, code_context: updatedCode } : null
        );
        setFlags((prev) =>
          prev.map((f) =>
            f.id === selectedFlag.id ? { ...f, rollout_percentage: nextRollout, code_context: updatedCode } : f
          )
        );

        // Arka planda sessizce GitHub'a commit at
        if (data.patched_code) {
          executeAutonomousBackgroundCommit(selectedFlag.id, data.patched_code);
        }

        setLogs((prev) => [
          `[${timeStr}] ⚡ AUTONOMOUS_SELF_HEAL (Risk Score: ${data.risk_score}/100)\n` +
            `• Root Cause: ${data.root_cause}\n` +
            `• Remediation: ${data.reasoning}\n` +
            `• Action: Patch committed to GitHub branch silently in background.\n` +
            `• Active Code Refreshed with Bounded Buffer.\n` +
            `✓ Canary progression continuing without downtime... (${nextRollout}%)`,
          ...prev,
        ]);

        setTimeout(() => {
          if (!isHaltedRef.current) {
            setTelemetry((t) => ({ ...t, p99Latency: 110, errorRate: 0.03 }));
          }
        }, 1200);

        if (nextRollout >= 100) {
          stopSimulation();
          setLogs((prev) => [
            `[${timeStr}] 🏆 FULL_RELEASE: Flag successfully scaled to 100% rollout with zero downtime!`,
            ...prev,
          ]);
        }

      // 2. KIRMIZI SEVİYE: DEVRE KESİCİ (Döngü durur, sağ panel kırmızı diff basar, insan mühendis onayı ister)
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
            `! CIRCUIT BREAKER TRIPPED: Autonomous loop halted immediately.\n` +
            `! High-risk architectural change requires human engineer sign-off.`,
          ...prev,
        ]);

        setSelectedFlag((prev) => (prev ? { ...prev, status: "investigating" } : null));
        setFlags((prev) =>
          prev.map((f) => (f.id === selectedFlag.id ? { ...f, status: "investigating" } : f))
        );

      // 3. YEŞİL SEVİYE: NORMAL İLERLEME
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

  const handleResetFlag = () => {
    if (!selectedFlag) return;
    stopSimulation();
    isHaltedRef.current = false;
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
            aiRemediationCode={remediation?.diff}
            tier={remediation?.tier}
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