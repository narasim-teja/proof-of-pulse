"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  Shield,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Coins,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  };

  const handleClaimReward = useCallback(async () => {
    setClaimState("loading");
    setClaimError(null);
    try {
      await callFunction({
        contractId: CONSUMER_CONTRACT_ID,
        methodName: "claim_reward",
        args: { attestation_key: data.attestation_key },
        gas: "60000000000000",
        deposit: "0",
      });
      setClaimState("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Claim failed";
      if (message.includes("rejected") || message.includes("Confidence")) {
        setClaimState("rejected");
      } else {
        setClaimState("error");
      }
      setClaimError(message);
    }
  }, [callFunction, data.attestation_key]);

  return (
    <div className="flex justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 animate-pulse">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Attestation Generated!</CardTitle>
          <CardDescription>
            Your workout proof has been submitted to the NEAR blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* NEAR Transaction */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">
              NEAR Transaction
            </label>
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="text-sm font-mono truncate flex-1">
                {data.near_tx}
              </span>
              <button
                onClick={() => copyToClipboard(data.near_tx)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={data.explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:text-emerald-400"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Attestation Key */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">
              Attestation Key
            </label>
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="text-sm font-mono truncate flex-1">
                {data.attestation_key}
              </span>
              <button
                onClick={() => copyToClipboard(data.attestation_key)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Shield className="mr-1 h-3 w-3" />
              Confidence: {data.attestation.confidence}/100
            </Badge>
            <Badge variant="secondary">
              {data.attestation.activity_type.replace(/_/g, " ")}
            </Badge>
            <Badge variant="secondary">
              {data.attestation.duration_mins} min
            </Badge>
            <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
              <ShieldCheck className="mr-1 h-3 w-3" />
              TEE Verified
            </Badge>
          </div>

          <Separator />

          {/* NOVA Vault Info */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">
              NOVA Privacy Vault
            </label>
            <div className="bg-muted rounded-lg px-3 py-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vault ID</span>
                <span className="font-mono text-xs">{data.nova_vault_id}</span>
              </div>
              {data.nova && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IPFS CID</span>
                    <span className="font-mono text-xs truncate max-w-[180px]">
                      {data.nova.cid}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data Hash</span>
                    <span className="font-mono text-xs truncate max-w-[180px]">
                      {data.attestation.data_hash.slice(0, 16)}...
                    </span>
                  </div>
                  {data.nova.is_new_vault && (
                    <Badge
                      variant="outline"
                      className="text-emerald-500 border-emerald-500/30 text-xs"
                    >
                      New Vault Created
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Oracle Info (collapsible) */}
          <div className="space-y-2">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
              onClick={() => setOracleOpen((o) => !o)}
            >
              <ShieldCheck className="h-3 w-3 text-cyan-400" />
              Oracle Info
              {oracleOpen ? (
                <ChevronUp className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </button>
            {oracleOpen && (
              <div className="bg-muted rounded-lg px-3 py-2 space-y-2 text-sm">
                {agentInfo && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Oracle</span>
                      <span>
                        {agentInfo.name}{" "}
                        <Badge variant="outline" className="text-xs ml-1">
                          v{agentInfo.version}
                        </Badge>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Runtime</span>
                      <span className="font-mono text-xs">shade-agent-tee</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">
                        Capabilities
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {agentInfo.capabilities.map((c) => (
                          <Badge
                            key={c}
                            variant="secondary"
                            className="text-xs"
                          >
                            {c.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {oracles.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-muted-foreground text-xs">
                      Authorized Oracles
                    </span>
                    {oracles.map((o) => (
                      <div
                        key={o.oracle_id}
                        className="flex justify-between text-xs"
                      >
                        <span className="font-mono truncate max-w-[200px]">
                          {o.oracle_id}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          v{o.version}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Claim SWEAT Reward */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">
              Cross-Contract Composability
            </label>
            <div className="bg-muted rounded-lg px-3 py-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Any dApp on NEAR can verify your attestation. Try claiming a mock
                Sweatcoin reward (requires confidence {">="} 80).
              </p>
              {claimState === "idle" && (
                <Button
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleClaimReward}
                  disabled={!walletConnected}
                >
                  <Coins className="mr-2 h-4 w-4" />
                  {walletConnected
                    ? "Claim 10 SWEAT"
                    : "Connect Wallet to Claim"}
                </Button>
              )}
              {claimState === "loading" && (
                <Button size="sm" className="w-full" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </Button>
              )}
              {claimState === "success" && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  10 SWEAT rewarded! Cross-contract verification passed.
                </div>
              )}
              {claimState === "rejected" && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <XCircle className="h-4 w-4" />
                  Reward rejected: confidence below 80%
                </div>
              )}
              {claimState === "error" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    Claim failed
                  </div>
                  {claimError && (
                    <p className="text-xs text-muted-foreground">{claimError}</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setClaimState("idle")}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onReset}>
              Start Over
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onViewVault}
            >
              View Vault
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
