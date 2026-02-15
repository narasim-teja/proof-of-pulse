"use client";

import { useAttestationFlow } from "@/hooks/use-attestation-flow";
import { StepIndicator } from "@/components/step-indicator";
import { UploadStep } from "@/components/upload-step";
import { AnalysisStep } from "@/components/analysis-step";
import { AttestationStep } from "@/components/attestation-step";
import { VaultStep } from "@/components/vault-step";

export function ProofWizard() {
  const flow = useAttestationFlow();

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
            onDateChange={(v) => flow.setField("date", v)}
            onUserIdChange={(v) => flow.setField("userId", v)}
            onToggleFilePath={(v) => flow.setField("useFilePath", v)}
            onFileRead={(content) => {
              flow.setField("xmlContent", content);
              flow.setField("useFilePath", false);
            }}
            onAnalyze={flow.analyze}
          />
        )}

        {flow.step === "analysis" && flow.analysisResult && (
          <AnalysisStep
            data={flow.analysisResult}
            loading={flow.loading}
            error={flow.error}
            onSubmitToNear={flow.attest}
            onBack={() => flow.goToStep("upload")}
          />
        )}

        {flow.step === "attestation" && flow.attestResult && (
          <AttestationStep
            data={flow.attestResult}
            onViewVault={() =>
              flow.fetchVault(flow.attestResult!.nova_vault_id)
            }
            onReset={flow.reset}
          />
        )}

        {flow.step === "vault" && (
          <VaultStep
            data={flow.vaultResult}
            novaVaultId={
              flow.attestResult?.nova_vault_id || "unknown"
            }
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
