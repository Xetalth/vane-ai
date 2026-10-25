"use client";

import React, { useState, useEffect } from "react";
import { FeatureFlag } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (flag: FeatureFlag) => void;
  organizationId?: number;
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  html_url: string;
}

export default function ImportFlagModal({
  isOpen,
  onClose,
  onCreated,
  organizationId = 1,
}: Props) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [connectedRepo, setConnectedRepo] = useState("");
  const [targetFilePath, setTargetFilePath] = useState("app/service.py");
  const [codeContext, setCodeContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // GitHub State
  const [isConnected, setIsConnected] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const hasToken = typeof document !== "undefined" && document.cookie.includes("gh_token=");
    const urlParams = new URLSearchParams(window.location.search);

    if (hasToken || urlParams.get("github_connected") === "true") {
      setIsConnected(true);
      fetchGithubRepos();
    }
  }, [isOpen]);

  const fetchGithubRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error("Failed to load GitHub repositories:", err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleConnectGithub = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      setErrorMsg("GitHub bağlantısı yapılandırılmamış. Vercel'de NEXT_PUBLIC_GITHUB_CLIENT_ID değişkenini tanımlayın.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo",
    });
    window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`);
  };

  const handleDisconnectGithub = async () => {
    setIsDisconnecting(true);
    try {
      await fetch("/api/auth/github/logout", { method: "POST" });
      setIsConnected(false);
      setRepos([]);
      setConnectedRepo("");
      setCodeContext("");
    } catch (err) {
      console.error("Failed to terminate GitHub session:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Depodan belirli bir dosyayı dinamik çeken fonksiyon
  const fetchFileFromRepo = async (repoFullName: string, filePath: string) => {
    if (!repoFullName || !filePath) return;

    setIsLoadingFile(true);
    try {
      const cleanRepo = repoFullName.replace(/^github\.com\//, "");
      const res = await fetch(`/api/github/file?repo=${encodeURIComponent(cleanRepo)}&path=${encodeURIComponent(filePath)}`);
      
      if (res.ok) {
        const fileData = await res.json();
        setCodeContext(fileData.content || "");
      } else {
        const errData = await res.json();
        setCodeContext(`// ${errData.error || `Source file '${filePath}' was not found in '${cleanRepo}'.`}\n// You may write or paste the monitored entrypoint manually.`);
      }
    } catch (err) {
      setCodeContext("// An unexpected network error occurred while resolving source context.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSelectRepo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setConnectedRepo(selected);

    if (!selected) {
      setCodeContext("");
      return;
    }

    const repoShortName = selected.split("/")[1] || selected;
    setName(`${repoShortName.replace(/[-_]/g, " ").toUpperCase()} CANARY`);
    setKey(`${repoShortName.toLowerCase()}-release`);

    fetchFileFromRepo(selected, targetFilePath);
  };

  const handleFilePathBlur = () => {
    if (connectedRepo && targetFilePath.trim()) {
      fetchFileFromRepo(connectedRepo, targetFilePath.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const res = await fetch(`${apiUrl}/api/v1/feature_flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_flag: {
            organization_id: organizationId,
            name,
            key,
            connected_repo: connectedRepo,
            code_context: codeContext,
            rollout_percentage: 5,
            status: "canary",
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.errors ? errData.errors.join(", ") : "Failed to register feature flag.");
      }

      const created = await res.json();
      onCreated(created);
      onClose();
      setName("");
      setKey("");
      setConnectedRepo("");
      setCodeContext("");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0a0e17] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Connect Repository & Feature Flag</h3>
            <p className="text-xs text-slate-400">Map your microservice repository directly for autonomous remediation.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* GitHub Auth Section */}
          <div className="rounded-xl border border-slate-800 bg-[#101623] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                GitHub Organization / Account
              </span>
              {!isConnected ? (
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Connect GitHub
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    GitHub Authorized
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectGithub}
                    disabled={isDisconnecting}
                    className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-400 hover:bg-rose-500/20 hover:border-rose-500 transition disabled:opacity-50"
                  >
                    <span>✕ Disconnect</span>
                  </button>
                </div>
              )}
            </div>

            {isConnected ? (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Select Target Repository</label>
                <select
                  value={connectedRepo}
                  onChange={handleSelectRepo}
                  disabled={isLoadingRepos}
                  className="w-full rounded-lg border border-slate-700 bg-[#0a0e17] px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none"
                >
                  <option value="">
                    {isLoadingRepos ? "Fetching repositories from GitHub..." : "-- Choose a repository --"}
                  </option>
                  {repos.map((r) => (
                    <option key={r.id} value={`github.com/${r.full_name}`}>
                      {r.full_name} ({r.default_branch})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Connected Repository (Manual Entry)</label>
                <input
                  type="text"
                  placeholder="github.com/acme/payment-service"
                  value={connectedRepo}
                  onChange={(e) => setConnectedRepo(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0a0e17] px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Release Name</label>
              <input
                type="text"
                placeholder="e.g. Settlement Engine"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0e17] px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Flag Key</label>
              <input
                type="text"
                placeholder="e.g. settlement-v2"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0e17] px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target File Entrypoint</label>
              <input
                type="text"
                placeholder="app/service.py"
                value={targetFilePath}
                onChange={(e) => setTargetFilePath(e.target.value)}
                onBlur={handleFilePathBlur}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0e17] px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-400">
                Monitored Source Context
              </label>
              {isLoadingFile ? (
                <span className="text-[10px] text-amber-400 animate-pulse font-mono">
                  Resolving {targetFilePath} via GitHub API...
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-mono">Synced from GitHub API</span>
              )}
            </div>
            <textarea
              rows={6}
              placeholder="// Select a repository and specify file entrypoint above..."
              value={codeContext}
              onChange={(e) => setCodeContext(e.target.value)}
              disabled={isLoadingFile}
              className="w-full rounded-lg border border-slate-700 bg-[#0a0e17] p-3 font-mono text-xs text-slate-200 focus:border-slate-500 focus:outline-none disabled:opacity-50"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingFile}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {isSubmitting ? "Registering..." : "Register Canary Flag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}