"use client";

import React from "react";
import { Organization } from "@/types";

interface Props {
  org: Organization | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Navbar({ org, onRefresh, isRefreshing }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-[#070a0f] px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="text-xl font-bold">~</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-100">VaneAI</h1>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
              Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-500">Autonomous Canary Release & Guardrail Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Tenant: <strong className="text-white">{org ? `${org.name} (${org.cluster_region})` : "Acme Cloud (US-East)"}</strong></span>
        </div>
        <button
          onClick={onRefresh}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Yenile"
        >
          <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
        </button>
      </div>
    </header>
  );
}