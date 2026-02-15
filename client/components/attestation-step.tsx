"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import {
  ExternalLink,
  Copy,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Coins,
  Loader2,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import type { AttestResponse, AgentInfo, OracleEntry } from "@/lib/types";
import * as api from "@/lib/api";

const CONSUMER_CONTRACT_ID = "mock-sweatcoin.testnet";

interface AttestationStepProps {
  data: AttestResponse;
  onViewVault: () => void;
  onReset: () => void;
  walletConnected: boolean;
}

export function AttestationStep({
  data,
  onViewVault,
  onReset,
  walletConnected,
}: AttestationStepProps) {
  const { callFunction } = useWalletSelector();
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [oracles, setOracles] = useState<OracleEntry[]>([]);
  const [oracleOpen, setOracleOpen] = useState(false);
  const [claimState, setClaimState] = useState<
    "idle" | "loading" | "success" | "rejected" | "error"
  >("idle");
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    api.getAgentInfo().then(setAgentInfo).catch(() => {});
    api.getOracles().then(setOracles).catch(() => {});
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  };

  const handleClaimReward = useCallback(async () => {
    setClaimState("loading");
    setClaimError(null);
    try {
      await callFunction({
        contractId: CONSUMER_CONTRACT_ID,
        method: "claim_reward",
        args: { attestation_key: data.attestation_key },
        gas: "60000000000000",
        deposit: "0",
      });
      setClaimState("success");
      toast.success("10 SWEAT rewarded!", {
        description: "Cross-contract verification passed",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Claim failed";
      if (message.includes("rejected") || message.includes("Confidence")) {
        setClaimState("rejected");
        toast.error("Reward rejected", {
          description: "Confidence below 80%",
        });
      } else {
        setClaimState("error");
        toast.error("Claim failed", { description: message });
      }
      setClaimError(message);
    }
  }, [callFunction, data.attestation_key]);

  return (
    <section className="px-6 sm:px-10 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-4">On-Chain Proof</div>

        {/* Terminal-style TX block */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden mb-8">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-600" />
            <span className="font-mono text-[10px] text-neutral-600 ml-2">
              near-transaction
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* NEAR TX */}
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">
                Transaction Hash
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-neutral-300 truncate flex-1">
                  {data.near_tx}
                </span>
                <button
                  onClick={() => copyToClipboard(data.near_tx)}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a
                  href={data.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-600 hover:text-neutral-300 transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Attestation Key */}
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">
                Attestation Key
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-neutral-300 truncate flex-1">
                  {data.attestation_key}
                </span>
                <button
                  onClick={() => copyToClipboard(data.attestation_key)}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-3 mb-8 font-mono text-xs">
          <span className="border border-neutral-800 px-3 py-1.5 rounded text-neutral-400">
            Confidence: {data.attestation.confidence}/100
          </span>
          <span className="border border-neutral-800 px-3 py-1.5 rounded text-neutral-400">
            {data.attestation.activity_type.replace(/_/g, " ")}
          </span>
          <span className="border border-neutral-800 px-3 py-1.5 rounded text-neutral-400">
            {data.attestation.duration_mins} min
          </span>
          <span className="border border-cyan-900/50 px-3 py-1.5 rounded text-cyan-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            TEE Verified
          </span>
        </div>

        {/* NOVA Vault Info */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 mb-6">
          <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-3">
            NOVA Privacy Vault
          </div>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-600">Vault ID</span>
              <span className="text-neutral-400">{data.nova_vault_id}</span>
            </div>
            {data.nova && (
              <>
                <div className="flex justify-between">
                  <span className="text-neutral-600">IPFS CID</span>
                  <span className="text-neutral-400 truncate max-w-[200px]">
                    {data.nova.cid}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Data Hash</span>
                  <span className="text-neutral-400 truncate max-w-[200px]">
                    {data.attestation.data_hash.slice(0, 16)}...
                  </span>
                </div>
                {data.nova.is_new_vault && (
                  <div className="flex items-center gap-1.5 text-emerald-500 pt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    New vault created
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Oracle Info (collapsible) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg mb-6">
          <button
            className="flex items-center gap-2 w-full px-5 py-3 font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            onClick={() => setOracleOpen((o) => !o)}
          >
            <ShieldCheck className="h-3 w-3 text-cyan-500" />
            <span className="uppercase tracking-wider">Oracle Info</span>
            {oracleOpen ? (
              <ChevronUp className="h-3 w-3 ml-auto" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-auto" />
            )}
          </button>
          {oracleOpen && (
            <div className="border-t border-neutral-800 px-5 py-4 space-y-3 font-mono text-xs">
              {agentInfo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Oracle</span>
                    <span className="text-neutral-400">
                      {agentInfo.name}{" "}
                      <span className="text-neutral-700">v{agentInfo.version}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Runtime</span>
                    <span className="text-neutral-400">shade-agent-tee</span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-neutral-600">Capabilities</span>
                    <div className="flex flex-wrap gap-1.5">
                      {agentInfo.capabilities.map((c) => (
                        <span
                          key={c}
                          className="border border-neutral-800 px-2 py-0.5 rounded text-neutral-500"
                        >
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {oracles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-neutral-600">Authorized Oracles</span>
                  {oracles.map((o) => (
                    <div key={o.oracle_id} className="flex justify-between">
                      <span className="text-neutral-400 truncate max-w-[220px]">
                        {o.oracle_id}
                      </span>
                      <span className="text-neutral-700">v{o.version}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Claim SWEAT Reward */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 mb-8">
          <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-3">
            Cross-Contract Composability
          </div>
          <p className="font-mono text-xs text-neutral-600 mb-4">
            Any dApp on NEAR can verify your attestation. Try claiming a mock
            Sweatcoin reward (requires confidence {">="} 80).
          </p>
          {claimState === "idle" && (
            <button
              onClick={handleClaimReward}
              disabled={!walletConnected}
              className="font-mono text-xs bg-amber-600 text-white px-5 py-2 rounded-full hover:bg-amber-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Coins className="h-3.5 w-3.5" />
              {walletConnected ? "Claim 10 SWEAT" : "Connect Wallet to Claim"}
            </button>
          )}
          {claimState === "loading" && (
            <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Claiming...
            </div>
          )}
          {claimState === "success" && (
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              10 SWEAT rewarded! Cross-contract verification passed.
            </div>
          )}
          {claimState === "rejected" && (
            <div className="flex items-center gap-2 font-mono text-xs text-amber-400">
              <XCircle className="h-3.5 w-3.5" />
              Reward rejected: confidence below 80%
            </div>
          )}
          {claimState === "error" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                Claim failed
              </div>
              {claimError && (
                <p className="font-mono text-xs text-neutral-600">{claimError}</p>
              )}
              <button
                onClick={() => setClaimState("idle")}
                className="font-mono text-xs text-neutral-400 border border-neutral-800 px-4 py-1.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onReset}
            className="font-mono text-xs text-neutral-400 border border-neutral-800 px-5 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={onViewVault}
            className="font-mono text-sm bg-white text-black px-6 py-2.5 rounded-full hover:bg-neutral-200 transition-colors"
          >
            View Vault
          </button>
        </div>
      </div>
    </section>
  );
}
