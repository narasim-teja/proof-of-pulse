import {
  Account,
  JsonRpcProvider,
  KeyPairSigner,
  getTransactionLastResult,
} from "near-api-js";
import type { AttestationResult } from "../types.js";

const NEAR_RPC_URL = "https://rpc.testnet.near.org";

function getOracleAccount(): Account {
  const provider = new JsonRpcProvider({ url: NEAR_RPC_URL });
  const signer = KeyPairSigner.fromSecretKey(
    process.env.ORACLE_PRIVATE_KEY as `ed25519:${string}`
  );
  return new Account(
    process.env.ORACLE_ACCOUNT_ID!,
    provider,
    signer
  );
}

function getReadOnlyProvider(): JsonRpcProvider {
  return new JsonRpcProvider({ url: NEAR_RPC_URL });
}

/**
 * Submit an attestation to the NEAR contract.
 * Uses the oracle account to sign the transaction.
 */
export async function submitAttestation(
  userId: string,
  attestation: AttestationResult,
  novaVaultId: string
): Promise<{ txHash: string; key: string }> {
  const account = getOracleAccount();

  const outcome = await account.callFunctionRaw({
    contractId: process.env.ATTESTATION_CONTRACT_ID!,
    methodName: "submit_attestation",
    args: {
      user_id: userId,
      activity_type: attestation.activity_type,
      duration_mins: attestation.duration_mins,
      avg_hr: attestation.avg_hr,
      max_hr: attestation.max_hr,
      min_hr: attestation.min_hr,
      hr_zone_distribution: JSON.stringify(attestation.hr_zone_distribution),
      recovery_score: attestation.recovery_score,
      confidence: attestation.confidence,
      data_hash: attestation.data_hash,
      nova_vault_id: novaVaultId,
    },
  });

  const txHash = outcome.transaction.hash;
  const key = getTransactionLastResult(outcome) as string;

  return { txHash, key };
}

/**
 * Query an existing attestation from the contract (view call).
 */
export async function getAttestation(
  key: string
): Promise<Record<string, unknown> | null> {
  const provider = getReadOnlyProvider();

  const result = await provider.callFunction<string>({
    contractId: process.env.ATTESTATION_CONTRACT_ID!,
    method: "get_attestation",
    args: { key },
  });

  if (!result) return null;
  return JSON.parse(result);
}

/**
 * Verify an attestation meets minimum confidence (view call).
 */
export async function verifyAttestation(
  key: string,
  minConfidence: number
): Promise<boolean> {
  const provider = getReadOnlyProvider();

  const result = await provider.callFunction<boolean>({
    contractId: process.env.ATTESTATION_CONTRACT_ID!,
    method: "verify_attestation",
    args: { key, min_confidence: minConfidence },
  });

  return result ?? false;
}

/**
 * Get the oracle account ID from the contract (view call).
 */
export async function getOracle(): Promise<string> {
  const provider = getReadOnlyProvider();

  const result = await provider.callFunction<string>({
    contractId: process.env.ATTESTATION_CONTRACT_ID!,
    method: "get_oracle",
    args: {},
  });

  return result ?? "";
}

/**
 * Fulfill a pending attestation request on the contract.
 * Called by the oracle after processing the HR data off-chain.
 */
export async function fulfillAttestation(
  requestId: string,
  userId: string,
  attestation: AttestationResult,
  novaVaultId: string
): Promise<{ txHash: string; key: string }> {
  const account = getOracleAccount();

  const outcome = await account.callFunctionRaw({
    contractId: process.env.ATTESTATION_CONTRACT_ID!,
    methodName: "fulfill_attestation",
    args: {
      request_id: requestId,
      user_id: userId,
      activity_type: attestation.activity_type,
      duration_mins: attestation.duration_mins,
      avg_hr: attestation.avg_hr,
      max_hr: attestation.max_hr,
      min_hr: attestation.min_hr,
      hr_zone_distribution: JSON.stringify(attestation.hr_zone_distribution),
      recovery_score: attestation.recovery_score,
      confidence: attestation.confidence,
      data_hash: attestation.data_hash,
      nova_vault_id: novaVaultId,
    },
  });

  const txHash = outcome.transaction.hash;
  const key = getTransactionLastResult(outcome) as string;

  return { txHash, key };
}

/**
 * Get pending attestation requests from the contract (view call).
 */
export interface PendingRequest {
  request_id: string;
  user_id: string;
  data_hash: string;
  timestamp: string;
  status: string;
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const provider = getReadOnlyProvider();

  try {
    const result = await provider.callFunction<PendingRequest[]>({
      contractId: process.env.ATTESTATION_CONTRACT_ID!,
      method: "get_pending_requests",
      args: {},
    });
    return result ?? [];
  } catch {
    return [];
  }
}
