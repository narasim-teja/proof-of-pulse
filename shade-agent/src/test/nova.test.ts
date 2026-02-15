import { describe, test } from "node:test";
import assert from "node:assert";
import {
  ensureVault,
  storeInNovaVault,
  grantAccess,
  revokeAccess,
  getVaultStatus,
  isNovaConfigured,
} from "../nova/vault.js";
import type { HRSample } from "../types.js";

function makeSamples(count: number): HRSample[] {
  const base = new Date("2026-02-14T12:30:00Z");
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(base.getTime() + i * 5000),
    bpm: 120 + Math.sin(i * 0.2) * 30,
    source: "Apple Watch",
  }));
}

// --- Mock-mode tests (always run) ---

describe("NOVA Vault", () => {
  test("ensureVault returns group ID and isNew flag", async () => {
    const result = await ensureVault("test.testnet");
    assert.ok(result.groupId, "groupId should be truthy");
    assert.strictEqual(typeof result.groupId, "string");
    assert.strictEqual(typeof result.isNew, "boolean");
  });

  test("group ID replaces dots with hyphens", async () => {
    const result = await ensureVault("alice.proof-of-pulse.testnet");
    assert.ok(result.groupId.includes("pop-"), "groupId should contain 'pop-'");
    assert.ok(!result.groupId.match(/\.\./), "groupId should not contain consecutive dots");
  });

  test("storeInNovaVault returns complete result", async () => {
    const samples = makeSamples(50);
    const result = await storeInNovaVault("test.testnet", samples, "2026-02-14");

    assert.ok(result.groupId, "groupId should be truthy");
    assert.ok(result.cid, "cid should be truthy");
    assert.ok(result.fileHash, "fileHash should be truthy");
    assert.strictEqual(result.fileHash.length, 64, "fileHash should be 64 chars (SHA-256 hex)");
    assert.ok(result.transactionId, "transactionId should be truthy");
    assert.strictEqual(typeof result.isNewVault, "boolean");
  });

  test("storeInNovaVault handles empty samples", async () => {
    const result = await storeInNovaVault("test.testnet", [], "2026-02-14");
    assert.ok(result.groupId, "groupId should be truthy");
    assert.ok(result.cid, "cid should be truthy");
    assert.ok(result.fileHash, "fileHash should be truthy");
  });

  test("storeInNovaVault produces deterministic hash for same input", async () => {
    const samples = [
      {
        timestamp: new Date("2026-02-14T12:30:00Z"),
        bpm: 142,
        source: "Apple Watch",
      },
    ];
    const r1 = await storeInNovaVault("test.testnet", samples, "2026-02-14");
    const r2 = await storeInNovaVault("test.testnet", samples, "2026-02-14");
    assert.strictEqual(r1.fileHash, r2.fileHash);
  });

  test("grantAccess returns grant object", async () => {
    const result = await grantAccess("pop-test-testnet", "researcher.testnet");
    assert.strictEqual(result.groupId, "pop-test-testnet");
    assert.strictEqual(result.memberId, "researcher.testnet");
    assert.ok(result.transactionId, "transactionId should be truthy");
  });

  test("revokeAccess returns transaction ID", async () => {
    const result = await revokeAccess("pop-test-testnet", "researcher.testnet");
    assert.ok(result.transactionId, "transactionId should be truthy");
  });

  test("getVaultStatus returns status object", async () => {
    const status = await getVaultStatus("pop-test-testnet");
    assert.strictEqual(status.groupId, "pop-test-testnet");
    assert.ok(Array.isArray(status.files), "files should be an array");
    assert.strictEqual(typeof status.fileCount, "number");
  });
});

// --- Integration tests (only when NOVA is configured and working) ---

const novaConfigured = isNovaConfigured();
const runIntegration = novaConfigured && process.env.NOVA_INTEGRATION_TEST === "1";

describe("NOVA Vault (live testnet)", { skip: !runIntegration }, () => {
  test("full round-trip: create vault + upload + verify status", { timeout: 30000 }, async () => {
    const samples = makeSamples(10);
    const result = await storeInNovaVault(
      `int-test-${Date.now()}`,
      samples,
      "2026-02-14"
    );

    assert.ok(!result.groupId.includes("mock"), "groupId should not be mock");
    assert.ok(!result.cid.includes("mock"), "cid should not be mock");
    assert.ok(!result.transactionId.includes("mock"), "transactionId should not be mock");

    const status = await getVaultStatus(result.groupId);
    assert.ok(status.owner, "owner should be truthy");
    assert.ok(status.fileCount >= 1, `fileCount ${status.fileCount} should be >= 1`);
  });
});
