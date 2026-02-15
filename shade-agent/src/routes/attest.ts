import { Hono } from "hono";
import { analyzeWorkout } from "../engine/attestation-engine";
import { submitAttestation } from "../near/submitter";
import type { HRSampleInput, WorkoutSession } from "../types";

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

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { hr_samples, user_id, nova_vault_id } = body as {
      hr_samples: HRSampleInput[];
      user_id?: string;
      nova_vault_id?: string;
    };

    if (!hr_samples || hr_samples.length < 10) {
      return c.json({ error: "Insufficient HR data (minimum 10 samples)" }, 400);
    }

    // 1. Analyze
    const session = buildSession(hr_samples);
    const attestation = analyzeWorkout(session);

    // 2. Submit to NEAR contract
    try {
      const { txHash, key } = await submitAttestation(
        user_id || "anonymous.testnet",
        attestation,
        nova_vault_id || ""
      );

      return c.json({
        attestation,
        near_tx: txHash,
        attestation_key: key,
        explorer_url: `https://testnet.nearblocks.io/txns/${txHash}`,
        oracle_type: "shade_agent_tee",
      });
    } catch (err: any) {
      // Return attestation even if NEAR submission fails
      return c.json(
        {
          attestation,
          near_tx: null,
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
