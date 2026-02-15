"use client";

import { useEffect, useState, useCallback } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { useAttestationFlow } from "@/hooks/use-attestation-flow";
import { StepIndicator } from "@/components/step-indicator";
import { UploadStep } from "@/components/upload-step";
import { AnalysisStep } from "@/components/analysis-step";
import { AttestationStep } from "@/components/attestation-step";
import { AsyncPending } from "@/components/async-pending";
import { VaultStep } from "@/components/vault-step";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

const CONTRACT_ID = "proof-of-pulse.testnet";

export function ProofWizard() {
  const flow = useAttestationFlow();
  const { signIn, signOut, signedAccountId, callFunction } =
    useWalletSelector();
  const [asyncLoading, setAsyncLoading] = useState(false);

  const connectedAccount = signedAccountId;

  // Auto-fill userId when wallet connects
  useEffect(() => {
    if (connectedAccount) {
      flow.setField("userId", connectedAccount);
    }
  }, [connectedAccount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    signIn();
  };

  const handleDisconnect = async () => {
    await signOut();
    flow.setField("userId", "test-user.testnet");
  };

  const handleRequestAsync = useCallback(async () => {
    if (!flow.analysisResult) return;
    setAsyncLoading(true);
    flow.setField("error", null);
    try {
      const result = await callFunction({
        contractId: CONTRACT_ID,
        methodName: "request_attestation",
        args: { data_hash: flow.analysisResult.attestation.data_hash },
        gas: "30000000000000",
        deposit: "0",
      });
      const requestId =
        typeof result === "string" ? result : JSON.stringify(result);
      flow.setField("asyncRequestId", requestId);
      flow.goToStep("attestation");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Async request failed";
      flow.setField("error", message);
    }
    setAsyncLoading(false);
  }, [flow.analysisResult, callFunction]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAsyncFulfilled = useCallback(() => {
    // Oracle fulfilled the request — reload by re-attesting through normal flow
    // For simplicity, just reset the async state and let user submit normally
    // In a production app, we'd fetch the attestation by key
    flow.setField("asyncRequestId", null);
    flow.attest();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              Proof of Pulse
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              NEAR Testnet
            </span>
          </div>

          {/* Wallet connection */}
          {connectedAccount ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-400 font-mono hidden sm:inline">
                {connectedAccount}
              </span>
              <span className="text-sm text-emerald-400 font-mono sm:hidden">
                {connectedAccount.length > 16
                  ? `${connectedAccount.slice(0, 8)}...${connectedAccount.slice(-8)}`
                  : connectedAccount}
              </span>
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleConnect}>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* Step indicator */}
      <StepIndicator currentStep={flow.step} />

      {/* Current step */}
      <main className="flex-1 pb-12">
        {flow.step === "upload" && (
          <UploadStep
            date={flow.date}
            userId={flow.userId}
            useFilePath={flow.useFilePath}
            loading={flow.loading}
            error={flow.error}
            walletConnected={!!connectedAccount}
            onDateChange={(v) => flow.setField("date", v)}
            onUserIdChange={(v) => flow.setField("userId", v)}
            onToggleFilePath={(v) => flow.setField("useFilePath", v)}
            onFileRead={(content) => {
              flow.setField("xmlContent", content);
              flow.setField("useFilePath", false);
            }}
            onAnalyze={flow.analyze}
            onConnectWallet={handleConnect}
          />
        )}

        {flow.step === "analysis" && flow.analysisResult && (
          <AnalysisStep
            data={flow.analysisResult}
            loading={flow.loading}
            error={flow.error}
            onSubmitToNear={flow.attest}
            onRequestAsync={handleRequestAsync}
            onBack={() => flow.goToStep("upload")}
            walletConnected={!!connectedAccount}
            asyncLoading={asyncLoading}
          />
        )}

        {flow.step === "attestation" &&
          flow.asyncRequestId &&
          !flow.attestResult && (
            <AsyncPending
              requestId={flow.asyncRequestId}
              onFulfilled={handleAsyncFulfilled}
              onReset={flow.reset}
            />
          )}

        {flow.step === "attestation" && flow.attestResult && (
          <AttestationStep
            data={flow.attestResult}
            onViewVault={() =>
              flow.fetchVault(flow.attestResult!.nova_vault_id)
            }
            onReset={flow.reset}
            walletConnected={!!connectedAccount}
          />
        )}

        {flow.step === "vault" && (
          <VaultStep
            data={flow.vaultResult}
            novaVaultId={flow.attestResult?.nova_vault_id || "unknown"}
            loading={flow.loading}
            error={flow.error}
            onFetchVault={flow.fetchVault}
            onGrant={flow.grantAccess}
            onRevoke={flow.revokeAccess}
            onReset={flow.reset}
          />
        )}
      </main>
    </div>
  );
}
