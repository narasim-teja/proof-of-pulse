import { describe, test, expect } from "bun:test";
import {
  ensureVault,
  storeInNovaVault,
  grantAccess,
  revokeAccess,
  getVaultStatus,
  isNovaConfigured,
} from "../nova/vault";
import type { HRSample } from "../types";

function makeSamples(count: number): HRSample[] {
  const base = new Date("2026-02-14T12:30:00Z");
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(base.getTime() + i * 5000),
    bpm: 120 + Math.sin(i * 0.2) * 30,
    source: "Apple Watch",
  }));
}

const novaConfigured = isNovaConfigured();

// --- Mock-mode tests (always run) ---

describe("NOVA Vault", () => {
  test("ensureVault returns group ID and isNew flag", { timeout: 15000 }, async () => {
    const result = await ensureVault("test.testnet");
    expect(result.groupId).toBeTruthy();
    expect(typeof result.groupId).toBe("string");
    expect(typeof result.isNew).toBe("boolean");
  });

  test("group ID replaces dots with hyphens", { timeout: 15000 }, async () => {
    const result = await ensureVault("alice.proof-of-pulse.testnet");
    expect(result.groupId).toContain("pop-");
    expect(result.groupId).not.toMatch(/\.\./);
  });

  test("storeInNovaVault returns complete result", { timeout: 15000 }, async () => {
    const samples = makeSamples(50);
    const result = await storeInNovaVault("test.testnet", samples, "2026-02-14");

    expect(result.groupId).toBeTruthy();
    expect(result.cid).toBeTruthy();
    expect(result.fileHash).toBeTruthy();
    expect(result.fileHash).toHaveLength(64); // SHA-256 hex
    expect(result.transactionId).toBeTruthy();
    expect(typeof result.isNewVault).toBe("boolean");
  });

  test("storeInNovaVault handles empty samples", { timeout: 15000 }, async () => {
    const result = await storeInNovaVault("test.testnet", [], "2026-02-14");
    expect(result.groupId).toBeTruthy();
    expect(result.cid).toBeTruthy();
    expect(result.fileHash).toBeTruthy();
  });

  test("storeInNovaVault produces deterministic hash for same input", { timeout: 15000 }, async () => {
    const samples = [
      {
        timestamp: new Date("2026-02-14T12:30:00Z"),
        bpm: 142,
        source: "Apple Watch",
      },
    ];
    const r1 = await storeInNovaVault("test.testnet", samples, "2026-02-14");
    const r2 = await storeInNovaVault("test.testnet", samples, "2026-02-14");
    expect(r1.fileHash).toBe(r2.fileHash);
  });

  test("grantAccess returns grant object", { timeout: 15000 }, async () => {
    const result = await grantAccess("pop-test-testnet", "researcher.testnet");
    expect(result.groupId).toBe("pop-test-testnet");
    expect(result.memberId).toBe("researcher.testnet");
    expect(result.transactionId).toBeTruthy();
  });

  test("revokeAccess returns transaction ID", { timeout: 15000 }, async () => {
    const result = await revokeAccess("pop-test-testnet", "researcher.testnet");
    expect(result.transactionId).toBeTruthy();
  });

  test("getVaultStatus returns status object", { timeout: 15000 }, async () => {
    const status = await getVaultStatus("pop-test-testnet");
    expect(status.groupId).toBe("pop-test-testnet");
    expect(Array.isArray(status.files)).toBe(true);
    expect(typeof status.fileCount).toBe("number");
  });
});

// --- Integration tests (only when NOVA is configured and working) ---
// These tests call real NOVA APIs. They are skipped when:
// - NOVA credentials are not set
// - NOVA testnet is unreachable (access key errors, RPC issues)
// To run: set NOVA_ACCOUNT_ID, NOVA_API_KEY, and NOVA_INTEGRATION_TEST=1

const runIntegration = novaConfigured && process.env.NOVA_INTEGRATION_TEST === "1";

describe.skipIf(!runIntegration)("NOVA Vault (live testnet)", () => {
  test("full round-trip: create vault + upload + verify status", { timeout: 30000 }, async () => {
    const samples = makeSamples(10);
    const result = await storeInNovaVault(
      `int-test-${Date.now()}`,
      samples,
      "2026-02-14"
    );

    expect(result.groupId).not.toContain("mock");
    expect(result.cid).not.toContain("mock");
    expect(result.transactionId).not.toContain("mock");

    const status = await getVaultStatus(result.groupId);
    expect(status.owner).toBeTruthy();
    expect(status.fileCount).toBeGreaterThanOrEqual(1);
  });
});
