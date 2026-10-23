"use client";

import React from "react";
import { FeatureFlag, TelemetryData } from "@/types";

interface Props {
  flag: FeatureFlag | null;
  telemetry: TelemetryData;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onResetFlag: () => void;
  onTriggerScenario: (type: "crash" | "latency" | "healthy") => void;
}

export default function TelemetryPanel({
  flag,
  telemetry,
  isSimulating,
  onStartSimulation,
  onStopSimulation,
  onResetFlag,
  onTriggerScenario,
}: Props) {
  if (!flag) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-[#090d16] text-slate-500 font-mono text-sm">
        Please select an active canary flag from the sidebar to inspect telemetry.
      </div>
    );
  }

  const isKilled = flag.status === "killed";

  return (
    <div className="space-y-5 rounded-2xl border border-slate-800/80 bg-[#090d16]/90 p-6 backdrop-blur-md">
      {/* Başlık ve Rollout Durumu */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white">{flag.name}</h2>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-xs text-emerald-400">
              {flag.key}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {flag.description || "Microservice deployment pipeline with autonomous AI guardrails."}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-500">Traffic Allocation</div>
          <div className={`text-2xl font-black ${isKilled ? "text-rose-500" : "text-emerald-400"}`}>
            {isKilled ? "0%" : `${flag.rollout_percentage}%`}
          </div>
        </div>
      </div>

      {/* İlerleme Çubuğu */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>Canary Stage Progression</span>
          <span>{isKilled ? "BLOCKED (CIRCUIT BREAKER)" : `${flag.rollout_percentage}% / 100%`}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              isKilled ? "bg-rose-500 w-full" : "bg-gradient-to-r from-emerald-500 to-teal-400"
            }`}
            style={{ width: isKilled ? "100%" : `${flag.rollout_percentage}%` }}
          />
        </div>
      </div>

      {/* Otonom Simülasyon Kontrolleri */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-800/80 py-4">
        <div className="flex items-center gap-2">
          {isSimulating ? (
            <button
              onClick={onStopSimulation}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Pause Autonomous Engine
            </button>
          ) : (
            <button
              onClick={onStartSimulation}
              disabled={isKilled}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Start Autonomous Loop
            </button>
          )}

          {isKilled && (
            <button
              onClick={onResetFlag}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
            >
              ↻ Recover / Reset Flag
            </button>
          )}
        </div>

        {/* Manuel Hızlı Test Tetikleyicileri */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTriggerScenario("crash")}
            className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-900/40"
          >
            ! Inject Crash
          </button>
          <button
            onClick={() => onTriggerScenario("latency")}
            className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-2.5 py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-900/40"
          >
            ~ Inject Latency
          </button>
          <button
            onClick={() => onTriggerScenario("healthy")}
            className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-900/40"
          >
            ✓ Healthy Pulse
          </button>
        </div>
      </div>

      {/* Telemetri Metrik Kartları */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Error Rate</div>
          <div className={`mt-1 text-lg font-bold ${telemetry.errorRate > 2 ? "text-rose-400" : "text-emerald-400"}`}>
            {telemetry.errorRate.toFixed(2)}%
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">p99 Latency</div>
          <div className={`mt-1 text-lg font-bold ${telemetry.p99Latency > 350 ? "text-amber-400" : "text-slate-100"}`}>
            {telemetry.p99Latency} ms
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Active Crashes</div>
          <div className={`mt-1 text-lg font-bold ${telemetry.activeCrashes > 0 ? "text-rose-400" : "text-slate-100"}`}>
            {telemetry.activeCrashes}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Canary Sample</div>
          <div className="mt-1 text-lg font-bold text-slate-100">{telemetry.canarySample}</div>
        </div>
      </div>
    </div>
  );
}