"use client";

import React from "react";
import { FeatureFlag } from "@/types";

interface RemediationState {
  tier: "yellow" | "red" | "nominal";
  rootCause: string;
  reasoning: string;
  diff: string | null;
  appliedAt?: string;
}

interface Props {
  flag: FeatureFlag | null;
  remediation: RemediationState | null;
  onApproveCriticalPatch: () => void;
  onRejectCriticalPatch: () => void; // <-- Yeni ret fonksiyonu
  isApplying: boolean;
}

export default function CodeContextViewer({
  flag,
  remediation,
  onApproveCriticalPatch,
  onRejectCriticalPatch,
  isApplying,
}: Props) {
  if (!flag) return null;

  const isCritical = remediation?.tier === "red";
  const isAutonomous = remediation?.tier === "yellow";

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#090d16]/90 p-5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Connected Repository & Source Context
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-teal-400">
            {flag.connected_repo || "repo/unassigned"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAutonomous && (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Autonomous Self-Healing Active ({remediation.appliedAt})
            </span>
          )}

          {isCritical && (
            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-rose-300 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Action Required: Human-in-the-Loop Review
            </span>
          )}

          {!remediation && (
            <span className="text-[10px] font-mono text-slate-500">Standby (Nominal Baseline)</span>
          )}
        </div>
      </div>

      {/* Remediation Summary Card */}
      {remediation && remediation.tier !== "nominal" && (
        <div
          className={`mt-3 rounded-lg border p-3 text-xs font-mono ${
            isCritical
              ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
              : "border-amber-500/30 bg-amber-950/20 text-amber-200"
          }`}
        >
          <div className="font-semibold uppercase tracking-wide">
            {isCritical ? "🚨 CRITICAL ARCHITECTURAL REMEDIATION PENDING" : "⚡ AUTONOMOUS REMEDIATION APPLIED"}
          </div>
          <div className="mt-1 text-slate-300">
            <span className="text-slate-400">Root Cause: </span>
            {remediation.rootCause}
          </div>
          <div className="mt-0.5 text-slate-300">
            <span className="text-slate-400">Agent Reasoning: </span>
            {remediation.reasoning}
          </div>
        </div>
      )}

      {/* Code Blocks */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Source Code */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Active Production Code</span>
            <span className="text-[10px] font-mono text-slate-500">Live Branch Mirror</span>
          </div>
          <pre className="h-48 overflow-x-auto rounded-xl border border-slate-800 bg-[#06090e] p-3 font-mono text-xs text-slate-300 leading-relaxed">
            <code>{flag.code_context || "// No source code mapped."}</code>
          </pre>
        </div>

        {/* AI Diff Panel */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">
              {isCritical ? "Pending Critical Diff" : "AI Self-Healing Hotfix Engine"}
            </span>

            {isCritical && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onRejectCriticalPatch}
                  disabled={isApplying}
                  className="rounded-md border border-rose-500/40 bg-rose-950/40 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-900/60 transition-colors disabled:opacity-50"
                >
                  ✕ Reject & Kill Release
                </button>
                <button
                  onClick={onApproveCriticalPatch}
                  disabled={isApplying}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {isApplying ? "Deploying..." : "✓ Approve & Merge"}
                </button>
              </div>
            )}
          </div>

          <pre
            className={`h-48 overflow-x-auto rounded-xl border p-3 font-mono text-xs leading-relaxed ${
              isCritical
                ? "border-rose-500/40 bg-[#0c0608] text-rose-300"
                : isAutonomous
                ? "border-amber-500/30 bg-[#0c0a06] text-amber-300"
                : "border-slate-800 bg-[#06090e] text-slate-500"
            }`}
          >
            <code>
              {remediation?.diff
                ? remediation.diff
                : "// System healthy. Realtime diff generator in standby mode.\n// Anomalies will trigger contextual patches here automatically."}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}