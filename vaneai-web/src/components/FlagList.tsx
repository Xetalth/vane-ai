"use client";

import React from "react";
import { FeatureFlag } from "@/types";

interface Props {
  flags: FeatureFlag[];
  error: string | null;
  selectedFlag: FeatureFlag | null;
  onSelect: (flag: FeatureFlag) => void;
  onOpenModal: () => void;
}

export default function FlagList({ flags, error, selectedFlag, onSelect, onOpenModal }: Props) {
  return (
    <aside className="w-80 border-r border-slate-800 bg-[#070a0f] p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>ACTIVE CANARY FLAGS</span>
          </div>
          <span className="text-xs text-slate-500">{flags.length} Managed</span>
        </div>

        <button
          onClick={onOpenModal}
          className="w-full mb-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
        >
          <span>+ Import New Feature Flag</span>
        </button>

        {error && (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="space-y-2">
          {flags.map((flag) => {
            const isSelected = selectedFlag?.id === flag.id;
            const isKilled = flag.status === "killed";

            return (
              <div
                key={flag.id}
                onClick={() => onSelect(flag)}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-200 leading-tight">{flag.name}</h4>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isKilled
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isKilled ? "OFF (KILLED)" : `${flag.rollout_percentage}% ROLLOUT`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {flag.description || flag.connected_repo || "Connected microservice endpoint"}
                </p>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isKilled ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: isKilled ? "100%" : `${flag.rollout_percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}