"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { toast } from "sonner";
import { useAttestationFlow } from "@/hooks/use-attestation-flow";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { UploadStep } from "@/components/upload-step";
import { UploadSummary } from "@/components/upload-summary";
import { AnalysisStep } from "@/components/analysis-step";
import { AttestProgress } from "@/components/attest-progress";
import { AttestationStep } from "@/components/attestation-step";
import { AsyncPending } from "@/components/async-pending";
import { VaultStep } from "@/components/vault-step";
import { Footer } from "@/components/footer";
import { Wallet, LogOut } from "lucide-react";

const CONTRACT_ID = "proof-of-pulse.testnet";

function Divider() {
  return <div className="border-t border-neutral-800 mx-6 sm:mx-10" />;
}

export function ProofWizard() {
  const flow = useAttestationFlow();
  const { signIn, signOut, signedAccountId, callFunction } =
    useWalletSelector();
  const [asyncLoading, setAsyncLoading] = useState(false);

  const uploadRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const attestRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);

  const connectedAccount = signedAccountId;

  // Auto-fill userId when wallet connects
  useEffect(() => {
    if (connectedAccount) {
      flow.setField("userId", connectedAccount);
      toast.success("Wallet connected", {
        description: connectedAccount,
      });
    }
  }, [connectedAccount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to analysis when it appears
  useEffect(() => {
    if (flow.analysisResult && flow.step === "analysis") {
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [flow.analysisResult, flow.step]);

  // Auto-scroll to attestation when it appears
  useEffect(() => {
    if (flow.attestResult && flow.step === "attestation") {
      setTimeout(() => {
        attestRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [flow.attestResult, flow.step]);

  // Auto-scroll to vault
  useEffect(() => {
    if (flow.step === "vault") {
      setTimeout(() => {
        vaultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [flow.step]);

  const handleConnect = () => {
    signIn();
  };

  const handleDisconnect = async () => {
    await signOut();
    flow.setField("userId", "test-user.testnet");
    toast("Wallet disconnected");
  };

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRequestAsync = useCallback(async () => {
    if (!flow.analysisResult) return;
    setAsyncLoading(true);
    flow.setField("error", null);
    try {
      const result = await callFunction({
        contractId: CONTRACT_ID,
        method: "request_attestation",
        args: { data_hash: flow.analysisResult.attestation.data_hash },
        gas: "30000000000000",
        deposit: "0",
      });
      const requestId =
        typeof result === "string" ? result : JSON.stringify(result);
      flow.setField("asyncRequestId", requestId);
      flow.goToStep("attestation");
      toast.info("Request submitted on-chain", {
        description: `ID: ${requestId.slice(0, 24)}...`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Async request failed";
      flow.setField("error", message);
      toast.error("Request failed", { description: message });
    }
    setAsyncLoading(false);
  }, [flow.analysisResult, callFunction]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAsyncFulfilled = useCallback(() => {
    flow.setField("asyncRequestId", null);
    flow.attest();
    toast.info("Oracle fulfilled your request");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showUploadForm = flow.step === "upload";
  const showAnalysis = !!flow.analysisResult && flow.step !== "upload";
  const showAttestProgressPanel = flow.attestPhase !== "idle";
  const showAsyncPending =
    !!flow.asyncRequestId && !flow.attestResult && flow.step === "attestation";
  const showAttestResult = !!flow.attestResult;
  const showVault = flow.step === "vault";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 sm:px-10 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-tight">
              PROOF OF PULSE
            </span>
            <span className="font-mono text-[10px] text-neutral-600 border border-neutral-800 px-2 py-0.5 rounded">
              TESTNET
            </span>
          </div>

          {/* Wallet connection */}
          {connectedAccount ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs text-neutral-400 hidden sm:inline">
                  {connectedAccount}
                </span>
                <span className="font-mono text-xs text-neutral-400 sm:hidden">
                  {connectedAccount.length > 16
                    ? `${connectedAccount.slice(0, 8)}...${connectedAccount.slice(-6)}`
                    : connectedAccount}
                </span>
              </span>
              <button
                onClick={handleDisconnect}
                className="text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="font-mono text-xs text-neutral-400 border border-neutral-800 px-4 py-1.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors flex items-center gap-2"
            >
              <Wallet className="h-3.5 w-3.5" />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <HeroSection onGetStarted={scrollToUpload} />

        <Divider />

        {/* How It Works */}
        <HowItWorks />

        <Divider />

        {/* Upload section */}
        <div ref={uploadRef}>
          {showUploadForm ? (
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
          ) : (
            <UploadSummary
              date={flow.date}
              userId={flow.userId}
              useFilePath={flow.useFilePath}
              onReset={flow.reset}
            />
          )}
        </div>

        {/* Analysis */}
        {showAnalysis && flow.analysisResult && (
          <>
            <Divider />
            <div ref={analysisRef} className="animate-fade-in-up">
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
            </div>
          </>
        )}

        {/* Attest Progress */}
        {showAttestProgressPanel && <AttestProgress phase={flow.attestPhase} />}

        {/* Async Pending */}
        {showAsyncPending && (
          <>
            <Divider />
            <AsyncPending
              requestId={flow.asyncRequestId!}
              onFulfilled={handleAsyncFulfilled}
              onReset={flow.reset}
            />
          </>
        )}

        {/* Attestation Result */}
        {showAttestResult && flow.attestResult && (
          <>
            <Divider />
            <div ref={attestRef} className="animate-fade-in-up">
              <AttestationStep
                data={flow.attestResult}
                onViewVault={() =>
                  flow.fetchVault(flow.attestResult!.nova_vault_id)
                }
                onReset={flow.reset}
                walletConnected={!!connectedAccount}
              />
            </div>
          </>
        )}

        {/* Vault */}
        {showVault && (
          <>
            <Divider />
            <div ref={vaultRef} className="animate-fade-in-up">
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
            </div>
          </>
        )}
      </main>

      <Divider />
      <Footer />
    </div>
  );
}
