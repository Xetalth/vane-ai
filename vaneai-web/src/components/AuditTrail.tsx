"use client";

import React from "react";

interface Props {
  logs: string[];
}

export default function AuditTrail({ logs }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#090d16]/90 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-400">&gt;_</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Agent Decision & Audit Trail (Harness Engine)
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">Model: Groq / LLaMA-3 Guardrail</span>
      </div>

      <div className="mt-3 h-44 overflow-y-auto rounded-xl border border-slate-800 bg-[#05080d] p-3 font-mono text-xs space-y-2">
        {logs.length === 0 ? (
          <div className="text-slate-600">No telemetry events evaluated yet. Start the autonomous loop.</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed text-slate-300 whitespace-pre-wrap">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}