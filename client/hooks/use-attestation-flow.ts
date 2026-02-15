"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { AnalyzeResponse, AttestResponse, VaultResponse } from "@/lib/types";
import * as api from "@/lib/api";

export type Step = "upload" | "analysis" | "attestation" | "vault";
export type AttestPhase = "idle" | "analyzing" | "storing" | "submitting" | "done";

interface FlowState {
  step: Step;
  date: string;
  userId: string;
  useFilePath: boolean;
  xmlContent: string | null;
  analysisResult: AnalyzeResponse | null;
  attestResult: AttestResponse | null;
  vaultResult: VaultResponse | null;
  asyncRequestId: string | null;
  loading: boolean;
  error: string | null;
  attestPhase: AttestPhase;
}

const initialState: FlowState = {
  step: "upload",
  date: "2026-02-14",
  userId: "test-user.testnet",
  useFilePath: true,
  xmlContent: null,
  analysisResult: null,
  attestResult: null,
  vaultResult: null,
  asyncRequestId: null,
  loading: false,
  error: null,
  attestPhase: "idle",
};

export function useAttestationFlow() {
  const [state, setState] = useState<FlowState>(initialState);

  const setField = useCallback(
    <K extends keyof FlowState>(key: K, value: FlowState[K]) => {
      setState((s) => ({ ...s, [key]: value, error: null }));
    },
    []
  );

  const analyze = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params: { date: string; file_path?: string; xml_data?: string } = {
        date: state.date,
      };
      if (state.useFilePath) {
        params.file_path = "data/export.xml";
      } else if (state.xmlContent) {
        params.xml_data = state.xmlContent;
      } else {
        throw new Error("No workout data provided");
      }
      const result = await api.analyzeWorkout(params);
      setState((s) => ({
        ...s,
        analysisResult: result,
        loading: false,
        step: "analysis",
      }));
      toast.success("Analysis complete", {
        description: `Confidence: ${result.attestation.confidence}/100`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setState((s) => ({ ...s, loading: false, error: message }));
      toast.error("Analysis failed", { description: message });
    }
  }, [state.date, state.useFilePath, state.xmlContent]);

  const attest = useCallback(async () => {
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      attestPhase: "analyzing",
    }));

    // Phase progression via timeouts
    const t1 = setTimeout(() => {
      setState((s) => ({ ...s, attestPhase: "storing" }));
    }, 800);
    const t2 = setTimeout(() => {
      setState((s) => ({ ...s, attestPhase: "submitting" }));
    }, 2500);

    try {
      const params: {
        date: string;
        user_id: string;
        file_path?: string;
        xml_data?: string;
      } = {
        date: state.date,
        user_id: state.userId,
      };
      if (state.useFilePath) {
        params.file_path = "data/export.xml";
      } else if (state.xmlContent) {
        params.xml_data = state.xmlContent;
      }
      const result = await api.submitAttestation(params);
      clearTimeout(t1);
      clearTimeout(t2);
      setState((s) => ({
        ...s,
        attestResult: result,
        loading: false,
        step: "attestation",
        attestPhase: "done",
      }));
      toast.success("Attestation created", {
        description: `TX: ${result.near_tx.slice(0, 16)}...`,
      });
      // Reset phase after a short delay so the progress UI can show "done"
      setTimeout(() => {
        setState((s) => ({ ...s, attestPhase: "idle" }));
      }, 1500);
    } catch (err: unknown) {
      clearTimeout(t1);
      clearTimeout(t2);
      const message =
        err instanceof Error ? err.message : "Attestation failed";
      setState((s) => ({
        ...s,
        loading: false,
        error: message,
        attestPhase: "idle",
      }));
      toast.error("Attestation failed", { description: message });
    }
  }, [state.date, state.userId, state.useFilePath, state.xmlContent]);

  const fetchVault = useCallback(async (groupId: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await api.getVaultStatus(groupId);
      setState((s) => ({
        ...s,
        vaultResult: result,
        loading: false,
        step: "vault",
      }));
      toast.success("Vault loaded");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Vault query failed";
      setState((s) => ({ ...s, loading: false, error: message }));
      toast.error("Vault query failed", { description: message });
    }
  }, []);

  const grantAccess = useCallback(
    async (groupId: string, memberId: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await api.grantVaultAccess(groupId, memberId);
        const result = await api.getVaultStatus(groupId);
        setState((s) => ({ ...s, vaultResult: result, loading: false }));
        toast.success("Access granted", {
          description: `${memberId} can now access your vault`,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Grant failed";
        setState((s) => ({ ...s, loading: false, error: message }));
        toast.error("Grant failed", { description: message });
      }
    },
    []
  );

  const revokeAccess = useCallback(
    async (groupId: string, memberId: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await api.revokeVaultAccess(groupId, memberId);
        const result = await api.getVaultStatus(groupId);
        setState((s) => ({ ...s, vaultResult: result, loading: false }));
        toast.success("Access revoked", {
          description: `${memberId} no longer has access`,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Revoke failed";
        setState((s) => ({ ...s, loading: false, error: message }));
        toast.error("Revoke failed", { description: message });
      }
    },
    []
  );

  const goToStep = useCallback((step: Step) => {
    setState((s) => ({ ...s, step, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setField,
    analyze,
    attest,
    fetchVault,
    grantAccess,
    revokeAccess,
    goToStep,
    reset,
  };
}
