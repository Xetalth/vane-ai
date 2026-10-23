"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Flame, 
  Clock, 
  Layers, 
  ChevronRight,
  UserCheck,
  RefreshCw
} from "lucide-react";

interface AgentAudit {
  id: number;
  risk_score: number;
  risk_tier: string;
  action_taken: string;
  execution_status: string;
  reasoning: string;
  payload: string;
  created_at: string;
}

interface CanaryMetric {
  id: number;
  error_rate: number;
  latency_p99: number;
  crash_count: number;
  sample_size: number;
  logs_payload: string;
  created_at: string;
}

interface FeatureFlag {
  id: number;
  name: string;
  key: string;
  description: string;
  environment: string;
  status: string;
  rollout_percentage: number;
  agent_audits: AgentAudit[];
  canary_metrics: CanaryMetric[];
}

export default function VaneAIDashboard() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3000/api/v1/feature_flags");
      const data: FeatureFlag[] = await res.json();
      setFlags(data);
      if (data.length > 0) {
        // Seçili bayrak varsa onu güncelle, yoksa ilkini seç
        setSelectedFlag(prev => prev ? data.find(f => f.id === prev.id) || data[0] : data[0]);
      }
    } catch (err) {
      console.error("Backend fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const runSimulation = async (scenario: "critical_crash" | "latency_spike" | "healthy") => {
    if (!selectedFlag) return;
    try {
      setSimulating(true);
      const res = await fetch(`http://localhost:3000/api/v1/feature_flags/${selectedFlag.id}/simulate_telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      // Verileri tazele
      await fetchFlags();
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const approveRollback = async () => {
    if (!selectedFlag) return;
    try {
      setSimulating(true);
      await fetchFetchApproval(selectedFlag.id);
      await fetchFlags();
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const fetchFetchApproval = async (id: number) => {
    return fetch(`http://localhost:3000/api/v1/feature_flags/${id}/approve_rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
  };

  const latestAudit = selectedFlag?.agent_audits?.[selectedFlag.agent_audits.length - 1];
  const latestMetric = selectedFlag?.canary_metrics?.[selectedFlag.canary_metrics.length - 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight">VaneAI</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Enterprise</span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Canary Release & Guardrail Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Tenant: <strong className="text-slate-200">Hulu (US-East Cluster)</strong>
          </div>
          <button 
            onClick={fetchFlags}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Feature Flag List */}
        <section className="col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Active Canary Flags
            </h2>
            <span className="text-xs text-slate-500">{flags.length} Managed</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {flags.map((flag) => {
              const isSelected = selectedFlag?.id === flag.id;
              const isKilled = flag.status.includes("killed");

              return (
                <div
                  key={flag.id}
                  onClick={() => setSelectedFlag(flag)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20" 
                      : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-sm text-slate-100 leading-snug">{flag.name}</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      isKilled 
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      {isKilled ? "OFF (KILLED)" : `${flag.rollout_percentage}% ROLLOUT`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 mb-3">{flag.description}</p>

                  {/* Rollout Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isKilled ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${flag.rollout_percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Telemetry & Autonomous Guardian Agent */}
        <section className="col-span-8 flex flex-col gap-6">
          {selectedFlag ? (
            <>
              {/* Flag Header Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold text-white">{selectedFlag.name}</h1>
                      <code className="text-xs bg-slate-950 px-2 py-0.5 rounded text-emerald-400 border border-slate-800">
                        {selectedFlag.key}
                      </code>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedFlag.description}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Traffic Allocation</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {selectedFlag.rollout_percentage}%
                    </span>
                  </div>
                </div>

                {/* Simulation Harness Controls */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      Simulate Telemetry Injection (Canary Traffic)
                    </span>
                    {simulating && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1.5 animate-pulse">
                        <Activity className="h-3.5 w-3.5 animate-spin" /> Evaluating with Guardian Agent...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      disabled={simulating}
                      onClick={() => runSimulation("critical_crash")}
                      className="px-3 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      1. Critical Buffer Crash (Auto-Rollback)
                    </button>

                    <button
                      disabled={simulating}
                      onClick={() => runSimulation("latency_spike")}
                      className="px-3 py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4 text-amber-400" />
                      2. Elevated Latency Spike (Guardrail Gate)
                    </button>

                    <button
                      disabled={simulating}
                      onClick={() => runSimulation("healthy")}
                      className="px-3 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      3. Healthy Traffic (Proceed)
                    </button>
                  </div>
                </div>
              </div>

              {/* HUMAN-IN-THE-LOOP GUARDRAIL INTERCEPTOR MODAL/BANNER */}
              {latestAudit && latestAudit.execution_status === "GUARDRAIL_BLOCKED" && (
                <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-5 flex items-start justify-between gap-4 shadow-xl shadow-amber-950/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-900/50 px-2 py-0.5 rounded border border-amber-700/50">
                          Guardrail Threshold Triggered
                        </span>
                        <span className="text-xs text-slate-300 font-semibold">Human-in-the-Loop Required</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 mt-1.5 leading-snug">
                        {latestAudit.reasoning}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ajan riski tarttı ve otonom kill-switch'i bilinçli olarak bloke etti (Risk Skoru: {latestAudit.risk_score}/100). Karar mühendis onayına sunuldu.
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={simulating}
                    onClick={approveRollback}
                    className="shrink-0 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    Approve & Execute Rollback (0%)
                  </button>
                </div>
              )}

              {/* AUTONOMOUS ZERO-TOUCH EXECUTION BANNER */}
              {latestAudit && latestAudit.action_taken === "AUTONOMOUS_ROLLBACK" && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-5 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-900/50 px-2 py-0.5 rounded border border-rose-700/50">
                        Zero-Touch Autonomous Rollback Executed
                      </span>
                      <span className="text-xs text-slate-400">Risk Score: {latestAudit.risk_score} (Immediate Urgency)</span>
                    </div>
                    <p className="text-sm text-slate-200 mt-1.5 leading-snug">{latestAudit.reasoning}</p>
                    <code className="text-xs font-mono text-rose-300/80 bg-slate-950 px-2 py-1 rounded block mt-2 border border-slate-800">
                      $ {latestAudit.payload}
                    </code>
                  </div>
                </div>
              )}

              {/* Live Telemetry Metrics Stream */}
              {latestMetric && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-400 block">Error Rate</span>
                    <span className={`text-xl font-bold mt-1 block ${latestMetric.error_rate > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {latestMetric.error_rate}%
                    </span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-400 block">p99 Latency</span>
                    <span className={`text-xl font-bold mt-1 block ${latestMetric.latency_p99 > 500 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {latestMetric.latency_p99} ms
                    </span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-400 block">Active Crashes</span>
                    <span className={`text-xl font-bold mt-1 block ${latestMetric.crash_count > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {latestMetric.crash_count}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-400 block">Canary Sample</span>
                    <span className="text-xl font-bold text-slate-200 mt-1 block">
                      {latestMetric.sample_size.toLocaleString()} reqs
                    </span>
                  </div>
                </div>
              )}

              {/* Terminal Logs & Reasoning Stream */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    Agent Decision & Audit Trail (Harness Engine)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Model: Groq / openai/gpt-oss-20b</span>
                </div>

                <div className="font-mono text-xs text-slate-300 max-h-48 overflow-y-auto flex flex-col gap-1.5 p-1">
                  {selectedFlag.agent_audits.length === 0 ? (
                    <span className="text-slate-600 italic">No telemetry events evaluated yet. Trigger a scenario above.</span>
                  ) : (
                    selectedFlag.agent_audits.slice().reverse().map((audit) => (
                      <div key={audit.id} className="border-b border-slate-900 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">[{new Date(audit.created_at).toLocaleTimeString()}]</span>
                          <span className={`font-bold ${
                            audit.action_taken === "AUTONOMOUS_ROLLBACK" ? "text-rose-400" :
                            audit.action_taken === "HUMAN_APPROVAL_REQUIRED" ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {audit.action_taken}
                          </span>
                          <span className="text-slate-400 text-[11px]">Status: {audit.execution_status} (Risk: {audit.risk_score}/100)</span>
                        </div>
                        <p className="text-slate-300 mt-0.5 ml-4">{audit.reasoning}</p>
                        <p className="text-slate-500 text-[11px] ml-4 font-mono">$ {audit.payload}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Select a flag from the left to view telemetry and release guardian controls.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}