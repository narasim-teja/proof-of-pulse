"use client";

import { CheckCircle2, ExternalLink, Copy, Shield } from "lucide-react";
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
import type { AttestResponse } from "@/lib/types";

interface AttestationStepProps {
  data: AttestResponse;
  onViewVault: () => void;
  onReset: () => void;
}

export function AttestationStep({
  data,
  onViewVault,
  onReset,
}: AttestationStepProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
