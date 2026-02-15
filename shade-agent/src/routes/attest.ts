import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { analyzeWorkout } from "../engine/attestation-engine.js";
import { parseHealthExport, extractWorkoutSession } from "../parser/health-export-parser.js";
import { submitAttestation } from "../near/submitter.js";
import { storeInNovaVault } from "../nova/vault.js";
import type { HRSampleInput, WorkoutSession, NovaVaultResult } from "../types.js";

const app = new Hono();

/**
 * Build a WorkoutSession from JSON HR sample inputs.
 */
function buildSession(hrSamples: HRSampleInput[]): WorkoutSession {
  const samples = hrSamples.map((s) => ({
    timestamp: new Date(s.timestamp),
    bpm: s.bpm,
    source: "shade-agent",
  }));

  samples.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const startDate = samples[0].timestamp;
  const endDate = samples[samples.length - 1].timestamp;
  const durationMins = Math.round(
    (endDate.getTime() - startDate.getTime()) / 60000
  );

  return { startDate, endDate, samples, durationMins };
}

/**
 * Load XML from body.xml_data string or body.file_path (defaults to data/export.xml).
 */
function loadXml(body: { xml_data?: string; file_path?: string }): string {
  if (body.xml_data) return body.xml_data;
  const path = body.file_path || "data/export.xml";
  return readFileSync(path, "utf-8");
}

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, nova_vault_id } = body as {
      user_id?: string;
      nova_vault_id?: string;
    };

    if (!user_id) {
      return c.json({ error: "user_id is required (from wallet connection)" }, 400);
    }

    let session: WorkoutSession | null = null;

    if (body.hr_samples && body.hr_samples.length > 0) {
      if (body.hr_samples.length < 10) {
        return c.json({ error: "Insufficient HR data (minimum 10 samples)" }, 400);
      }
      session = buildSession(body.hr_samples);
    } else if (body.date) {
      const xmlContent = loadXml(body);
      const samples = parseHealthExport(xmlContent);
      session = extractWorkoutSession(samples, body.date);

      if (!session) {
        return c.json({ error: "No workout session found" }, 400);
      }
    } else {
      return c.json({ error: "Provide hr_samples or date (with optional xml_data/file_path)" }, 400);
    }

    // 1. Analyze
    const attestation = analyzeWorkout(session);

    // Build HR timeline for frontend chart
    const step = Math.max(1, Math.floor(session.samples.length / 150));
    const hr_timeline = session.samples
      .filter((_: unknown, i: number) => i % step === 0)
      .map((s) => ({ time: s.timestamp.toISOString(), bpm: Math.round(s.bpm) }));

    // 2. Store raw HR data in NOVA Privacy Vault
    let novaResult: NovaVaultResult | null = null;
    try {
      novaResult = await storeInNovaVault(
        user_id!,
        session.samples,
        body.date || new Date().toISOString().split("T")[0]
      );
    } catch (err: any) {
      console.warn(`[NOVA] Storage failed: ${err.message}`);
    }
    const novaVaultId = novaResult?.groupId ?? nova_vault_id ?? `fallback_${Date.now()}`;

    // 3. Submit to NEAR contract
    try {
      const { txHash, key } = await submitAttestation(
        user_id!,
        attestation,
        novaVaultId
      );

      return c.json({
        attestation,
        hr_timeline,
        near_tx: txHash,
        attestation_key: key,
        nova_vault_id: novaVaultId,
        nova: novaResult
          ? {
              cid: novaResult.cid,
              file_hash: novaResult.fileHash,
              nova_tx: novaResult.transactionId,
              is_new_vault: novaResult.isNewVault,
            }
          : null,
        explorer_url: `https://testnet.nearblocks.io/txns/${txHash}`,
        oracle_type: "shade_agent_tee",
      });
    } catch (err: any) {
      return c.json(
        {
          attestation,
          hr_timeline,
          near_tx: null,
          nova_vault_id: novaVaultId,
          error: `NEAR submission failed: ${err.message}`,
          oracle_type: "shade_agent_tee",
        },
        500
      );
    }
  } catch (err: any) {
    return c.json({ error: `Attestation failed: ${err.message}` }, 500);
  }
});

export default app;
