"use client";

import { useState } from "react";
import {
  Lock,
  UserPlus,
  UserMinus,
  RefreshCw,
  FileText,
} from "lucide-react";
import type { VaultResponse } from "@/lib/types";

interface VaultStepProps {
  data: VaultResponse | null;
  novaVaultId: string;
  loading: boolean;
  error: string | null;
  onFetchVault: (groupId: string) => void;
  onGrant: (groupId: string, memberId: string) => void;
  onRevoke: (groupId: string, memberId: string) => void;
  onReset: () => void;
}

export function VaultStep({
  data,
  novaVaultId,
  loading,
  error,
  onFetchVault,
  onGrant,
  onRevoke,
  onReset,
}: VaultStepProps) {
  const [memberId, setMemberId] = useState("");

  const vault = data?.vault;

  return (
    <section className="px-6 sm:px-10 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-4">Privacy Vault</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vault info */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-5">
              <Lock className="h-5 w-5 text-neutral-500" />
              <h3 className="font-mono text-sm font-semibold text-neutral-300">
                NOVA Privacy Vault
              </h3>
            </div>

            <p className="font-mono text-xs text-neutral-600 mb-5 leading-relaxed">
              Your raw biometric data is encrypted and stored in a NOVA vault.
              Control who can access it.
            </p>

            {/* Vault ID */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 mb-4">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-neutral-600">Vault ID</span>
                <span className="text-neutral-400">{novaVaultId}</span>
              </div>
            </div>

            {/* Fetch button if no data yet */}
            {!vault && (
              <button
                onClick={() => onFetchVault(novaVaultId)}
                disabled={loading}
                className="w-full font-mono text-xs text-neutral-400 border border-neutral-800 px-5 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Load Vault Status
              </button>
            )}

            {/* Vault status */}
            {vault && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                    <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mb-1">
                      Owner
                    </div>
                    <div className="font-mono text-xs text-neutral-400 truncate">
                      {vault.owner || "Unknown"}
                    </div>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
                    <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mb-1">
                      Files
                    </div>
                    <div className="font-mono text-lg font-bold text-white">
                      {vault.fileCount}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${vault.isAuthorized ? "bg-emerald-500" : "bg-red-400"}`}
                  />
                  <span
                    className={
                      vault.isAuthorized
                        ? "text-emerald-500"
                        : "text-red-400"
                    }
                  >
                    {vault.isAuthorized ? "Authorized" : "Not Authorized"}
                  </span>
                </div>

                {/* File list */}
                {vault.files.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">
                      Stored Files
                    </div>
                    {vault.files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                        <span className="font-mono text-xs text-neutral-400 truncate">
                          {f.ipfsHash}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Access controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-5">
              Data Sharing
            </div>

            <p className="font-mono text-xs text-neutral-600 mb-5 leading-relaxed">
              Grant or revoke access to specific NEAR accounts. Researchers or
              dApps you authorize can decrypt and read your vault data.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="researcher.testnet"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="block w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 font-mono text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  disabled={!memberId || loading}
                  onClick={() => {
                    onGrant(novaVaultId, memberId);
                    setMemberId("");
                  }}
                  className="flex-1 font-mono text-xs text-neutral-400 border border-neutral-800 px-4 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Grant
                </button>
                <button
                  disabled={!memberId || loading}
                  onClick={() => {
                    onRevoke(novaVaultId, memberId);
                    setMemberId("");
                  }}
                  className="flex-1 font-mono text-xs text-neutral-400 border border-neutral-800 px-4 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="font-mono text-xs text-red-400 mt-4">{error}</p>
            )}
          </div>
        </div>

        {/* Reset */}
        <div className="mt-8">
          <button
            onClick={onReset}
            className="font-mono text-xs text-neutral-400 border border-neutral-800 px-5 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    </section>
  );
}
