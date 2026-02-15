"use client";

import { useState, useCallback } from "react";
import type { AnalyzeResponse, AttestResponse, VaultResponse } from "@/lib/types";
import * as api from "@/lib/api";

export type Step = "upload" | "analysis" | "attestation" | "vault";

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [state.date, state.useFilePath, state.xmlContent]);

  const attest = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
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
      setState((s) => ({
        ...s,
        attestResult: result,
        loading: false,
        step: "attestation",
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Attestation failed";
      setState((s) => ({ ...s, loading: false, error: message }));
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Vault query failed";
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  const grantAccess = useCallback(
    async (groupId: string, memberId: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await api.grantVaultAccess(groupId, memberId);
        const result = await api.getVaultStatus(groupId);
        setState((s) => ({ ...s, vaultResult: result, loading: false }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Grant failed";
        setState((s) => ({ ...s, loading: false, error: message }));
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Revoke failed";
        setState((s) => ({ ...s, loading: false, error: message }));
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
