"use client";

import React, { useState } from "react";
import { FeatureFlag } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (flag: FeatureFlag) => void;
  organizationId?: number;
}

export default function ImportFlagModal({ isOpen, onClose, onCreated, organizationId }: Props) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [repo, setRepo] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/feature_flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_flag: {
            name,
            key,
            connected_repo: repo,
            code_context: code,
            organization_id: organizationId,
            rollout_percentage: 5,
            status: "canary",
            environment: "production",
          },
        }),
      });

      if (res.ok) {
        const newFlag = await res.json();
        onCreated(newFlag);
        onClose();
        setName("");
        setKey("");
        setRepo("");
        setCode("");
      }
    } catch (err) {
      console.error("Flag import hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0b0f17] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-slate-100">Import Canary Flag & Code Context</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase">Feature / Release Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AV1 Encoder Engine v2"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase">Feature Key</label>
            <input
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. av1-encoder-v2"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase">Connected Repository</label>
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="github.com/company/transcoder"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase">Target Code Snippet (For AI Diff)</label>
            <textarea
              rows={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Paste target function for AI anomaly root-cause..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register Flag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}