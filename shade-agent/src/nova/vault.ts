import { createHash } from "node:crypto";
import { NovaSdk, NovaError } from "nova-sdk-js";
import type {
  HRSample,
  NovaVaultResult,
  NovaShareGrant,
  NovaVaultStatus,
} from "../types.js";

// --- Lazy-initialized SDK singleton ---

let _sdk: NovaSdk | null = null;
let _initAttempted = false;

function getSdk(): NovaSdk | null {
  if (_sdk) return _sdk;
  if (_initAttempted) return null;
  _initAttempted = true;

  const accountId = process.env.NOVA_ACCOUNT_ID;
  const apiKey = process.env.NOVA_API_KEY;

  if (!accountId || !apiKey) {
    console.warn("[NOVA] NOVA_ACCOUNT_ID or NOVA_API_KEY not set — using mock mode");
    return null;
  }

  _sdk = new NovaSdk(accountId, {
    apiKey,
  });

  console.log(`[NOVA] SDK initialized for ${accountId}`);
  return _sdk;
}

export function isNovaConfigured(): boolean {
  return getSdk() !== null;
}

// --- Group ID convention ---

function toGroupId(userId: string): string {
  return `pop-${userId.replace(/\./g, "-")}`;
}

// --- Vault (Group) Management ---

export async function ensureVault(
  userId: string
): Promise<{ groupId: string; isNew: boolean }> {
  const groupId = toGroupId(userId);
  const sdk = getSdk();

  if (!sdk) {
    return { groupId: `mock-${groupId}`, isNew: false };
  }

  try {
    const owner = await sdk.getGroupOwner(groupId);
    if (owner) {
      return { groupId, isNew: false };
    }
  } catch {
    // Group doesn't exist yet — will create
  }

  try {
    await sdk.registerGroup(groupId);
    console.log(`[NOVA] Created vault: ${groupId}`);
    return { groupId, isNew: true };
  } catch (err) {
    if (err instanceof NovaError && err.message.includes("already")) {
      return { groupId, isNew: false };
    }
    console.warn(`[NOVA] Failed to register group: ${err}`);
    return { groupId: `mock-${groupId}`, isNew: false };
  }
}

// --- File Upload ---

export async function uploadSessionData(
  groupId: string,
  samples: HRSample[],
  sessionDate: string
): Promise<{ cid: string; fileHash: string; transactionId: string }> {
  const payload = JSON.stringify(
    samples.map((s: HRSample) => ({
      t: s.timestamp.toISOString(),
      bpm: s.bpm,
      src: s.source,
    }))
  );

  const dataBuffer = Buffer.from(payload, "utf-8");
  const filename = `session-${sessionDate}-${Date.now()}.json`;
  const sdk = getSdk();

  if (!sdk || groupId.startsWith("mock-")) {
    const hash = createHash("sha256")
      .update(dataBuffer)
      .digest("hex");
    return {
      cid: `mock-cid-${Date.now()}`,
      fileHash: hash,
      transactionId: `mock-tx-${Date.now()}`,
    };
  }

  const result = await sdk.upload(groupId, dataBuffer, filename);
  return {
    cid: result.cid,
    fileHash: result.file_hash,
    transactionId: result.trans_id,
  };
}

// --- Main entry point ---

export async function storeInNovaVault(
  userId: string,
  samples: HRSample[],
  sessionDate: string
): Promise<NovaVaultResult> {
  const { groupId, isNew } = await ensureVault(userId);

  const { cid, fileHash, transactionId } = await uploadSessionData(
    groupId,
    samples,
    sessionDate
  );

  console.log(`[NOVA] Stored ${samples.length} HR samples in vault ${groupId}`);

  return { groupId, cid, fileHash, transactionId, isNewVault: isNew };
}

// --- Access Control ---

export async function grantAccess(
  groupId: string,
  memberId: string
): Promise<NovaShareGrant> {
  const sdk = getSdk();

  if (!sdk) {
    console.warn(`[NOVA] Mock grant: ${memberId} -> ${groupId}`);
    return { groupId, memberId, transactionId: `mock-tx-${Date.now()}` };
  }

  try {
    await sdk.addGroupMember(groupId, memberId);
    console.log(`[NOVA] Granted ${memberId} access to ${groupId}`);
    return { groupId, memberId, transactionId: `grant-${Date.now()}` };
  } catch (err) {
    console.warn(`[NOVA] Grant failed: ${err}`);
    return { groupId, memberId, transactionId: `mock-tx-${Date.now()}` };
  }
}

export async function revokeAccess(
  groupId: string,
  memberId: string
): Promise<{ transactionId: string }> {
  const sdk = getSdk();

  if (!sdk) {
    console.warn(`[NOVA] Mock revoke: ${memberId} from ${groupId}`);
    return { transactionId: `mock-tx-${Date.now()}` };
  }

  try {
    await sdk.revokeGroupMember(groupId, memberId);
    console.log(`[NOVA] Revoked ${memberId} from ${groupId}`);
    return { transactionId: `revoke-${Date.now()}` };
  } catch (err) {
    console.warn(`[NOVA] Revoke failed: ${err}`);
    return { transactionId: `mock-tx-${Date.now()}` };
  }
}

// --- Vault Status ---

export async function getVaultStatus(
  groupId: string
): Promise<NovaVaultStatus> {
  const sdk = getSdk();

  if (!sdk) {
    return {
      groupId,
      owner: null,
      isAuthorized: false,
      fileCount: 0,
      files: [],
    };
  }

  const [owner, isAuthorized, transactions] = await Promise.all([
    sdk.getGroupOwner(groupId).catch(() => null),
    sdk.isAuthorized(groupId).catch(() => false),
    sdk.getTransactionsForGroup(groupId).catch(() => []),
  ]);

  return {
    groupId,
    owner,
    isAuthorized,
    fileCount: transactions.length,
    files: transactions.map((tx: any) => ({
      fileHash: tx.file_hash,
      ipfsHash: tx.ipfs_hash,
      userId: tx.user_id,
    })),
  };
}

// --- Data Retrieval ---

export async function retrieveSessionData(
  groupId: string,
  cid: string
): Promise<Array<{ t: string; bpm: number; src: string }> | null> {
  const sdk = getSdk();

  if (!sdk) {
    console.warn("[NOVA] Cannot retrieve: SDK not configured");
    return null;
  }

  const result = await sdk.retrieve(groupId, cid);
  const json = result.data.toString("utf-8");
  return JSON.parse(json);
}
