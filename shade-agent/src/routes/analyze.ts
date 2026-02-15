import { Hono } from "hono";
import { analyzeWorkout } from "../engine/attestation-engine";
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
    const { hr_samples } = body as { hr_samples: HRSampleInput[] };

    if (!hr_samples || hr_samples.length < 10) {
      return c.json({ error: "Insufficient HR data (minimum 10 samples)" }, 400);
    }

    const session = buildSession(hr_samples);
    const attestation = analyzeWorkout(session);

    return c.json({
      ...attestation,
      oracle: "shade-agent-tee",
      processed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return c.json({ error: `Analysis failed: ${err.message}` }, 500);
  }
});

export default app;
