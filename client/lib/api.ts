import type { AnalyzeResponse, AttestResponse, VaultResponse } from "./types";

export async function analyzeWorkout(params: {
  date: string;
  file_path?: string;
  xml_data?: string;
}): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Analysis failed");
  }
  return res.json();
}

export async function submitAttestation(params: {
  date: string;
  user_id: string;
  file_path?: string;
  xml_data?: string;
}): Promise<AttestResponse> {
  const res = await fetch("/api/attest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Attestation failed");
  }
  return res.json();
}

export async function getVaultStatus(groupId: string): Promise<VaultResponse> {
  const res = await fetch(`/api/vault/${encodeURIComponent(groupId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Vault query failed");
  }
  return res.json();
}

export async function grantVaultAccess(
  groupId: string,
  memberId: string
): Promise<{ grant: { groupId: string; memberId: string; transactionId: string } }> {
  const res = await fetch("/api/vault/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId, member_id: memberId }),
  });
  if (!res.ok) throw new Error("Grant failed");
  return res.json();
}

export async function revokeVaultAccess(
  groupId: string,
  memberId: string
): Promise<{ revoke: { transactionId: string } }> {
  const res = await fetch("/api/vault/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId, member_id: memberId }),
  });
  if (!res.ok) throw new Error("Revoke failed");
  return res.json();
}
