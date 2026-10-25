"use client";

import React, { useState } from "react";
import { FeatureFlag } from "@/types";

interface Props {
  flag: FeatureFlag | null;
  aiRemediationCode?: string | null;
  tier?: "yellow" | "red" | "nominal" | null;
}

export default function CodeContextViewer({
  flag,
  aiRemediationCode,
  tier = "nominal",
}: Props) {
  const [isApplying, setIsApplying] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!flag) {
    return (
      <div className="panel-surface flex h-48 items-center justify-center font-mono text-xs text-slate-500">
        No microservice context loaded. Select an active flag from the inventory.
      </div>
    );
  }

  const getGithubToken = () => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; gh_token=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  const handleApplyHotfix = async () => {
    const token = getGithubToken();
    if (!token) {
      alert("GitHub access token not found. Please connect your GitHub account via the Import Flag modal first.");
      return;
    }

    if (!aiRemediationCode) {
      alert("No autonomous remediation code generated to commit.");
      return;
    }

    setIsApplying(true);
    setErrorMsg(null);
    setSuccessUrl(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const res = await fetch(`${apiUrl}/api/v1/remediations/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Token": token,
        },
        body: JSON.stringify({
          feature_flag_id: flag.id,
          file_path: "app/service.py",
          patched_code: aiRemediationCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to commit hotfix to GitHub.");
      }

      const prUrl = data.data?.pr_url;
      if (prUrl) {
        setSuccessUrl(prUrl);
        window.open(prUrl, "_blank");
      }
    } catch (err: any) {
      console.error("Hotfix deployment error:", err);
      setErrorMsg(err.message || "An unexpected error occurred during hotfix deployment.");
    } finally {
      setIsApplying(false);
    }
  };

  const isRed = tier === "red";
  const isYellow = tier === "yellow";

  return (
    <div className="panel-surface">
      {/* Üst Başlık ve Bağlı Depo Bilgisi */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Connected Repository & Source Context
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
            {flag.connected_repo || "github.com/acme/unassigned-service"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {successUrl && (
            <a
              href={successUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-emerald-400 underline hover:text-emerald-300"
            >
              View Opened PR ↗
            </a>
          )}
          <span className="text-[11px] font-mono text-slate-500">
            {isRed
              ? "Critical Incident Active"
              : isYellow
              ? "Autonomous Self-Healing Active"
              : "Standby (Nominal Baseline)"}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Kod Karşılaştırma Izgarası */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        {/* Canlı Üretim Kodu */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active Production Code</span>
            <span className="font-mono text-slate-500">Live Branch Mirror</span>
          </div>
          <pre className="h-56 overflow-x-auto rounded-xl border border-slate-800 bg-[#0a0e17] p-3.5 font-mono text-xs leading-relaxed text-slate-300">
            <code>
              {flag.code_context ||
                `// No code snippet mapped for this release.\n// Please configure entrypoint context in canary flag settings.`}
            </code>
          </pre>
        </div>

        {/* AI Otonom Hotfix Diff Penceresi (Sarı ve Kırmızı Durum Renkleri) */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>AI Self-Healing Hotfix Engine</span>
            {isRed && (
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-400 border border-rose-500/20">
                CRITICAL DIFF GENERATED
              </span>
            )}
            {isYellow && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-400 border border-amber-500/20">
                AUTONOMOUS OPTIMIZATION DIFF
              </span>
            )}
          </div>
          <pre
            className={`h-56 overflow-x-auto rounded-xl border p-3.5 font-mono text-xs leading-relaxed transition-all duration-300 ${
              isRed
                ? "border-rose-500/40 bg-rose-950/15 text-rose-200"
                : isYellow
                ? "border-amber-500/40 bg-amber-950/15 text-amber-200"
                : "border-slate-800 bg-[#0a0e17] text-slate-500"
            }`}
          >
            <code>
              {aiRemediationCode ||
                `// System healthy. Realtime diff generator in standby mode.\n// Anomalies will trigger contextual patches here automatically.`}
            </code>
          </pre>
        </div>
      </div>

      {/* Sadece Kırmızı Durumda Çıkan Onay ve PR Açma Butonu */}
      {isRed && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3">
          <div className="text-xs text-rose-200">
            <span className="font-semibold text-rose-400">Action Required:</span> Autonomous patch generated to arrest
            canary failure. Deploying creates a dedicated hotfix branch and PR.
          </div>
          <button
            onClick={handleApplyHotfix}
            disabled={isApplying}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                Committing to GitHub...
              </>
            ) : (
              "Approve & Deploy Hotfix PR"
            )}
          </button>
        </div>
      )}

      {/* Sarı Durumda Çıkan Bilgilendirme Çubuğu (Butonsuz, Kendiliğinden İlerler) */}
      {isYellow && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5">
          <div className="text-xs text-amber-200 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong className="text-amber-400">Self-Healing In Progress:</strong> Low-risk latency patch committed to branch. Canary traffic expanding seamlessly.
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-400/80">Zero Downtime Applied</span>
        </div>
      )}
    </div>
  );
}