import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { analyzeWorkout } from "../engine/attestation-engine.js";
import { parseHealthExport, extractWorkoutSession } from "../parser/health-export-parser.js";
import type { HRSampleInput, WorkoutSession } from "../types.js";

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

    let session: WorkoutSession | null = null;

    if (body.hr_samples && body.hr_samples.length > 0) {
      // JSON HR samples path
      if (body.hr_samples.length < 10) {
        return c.json({ error: "Insufficient HR data (minimum 10 samples)" }, 400);
      }
      session = buildSession(body.hr_samples);
    } else if (body.date) {
      // XML path (client sends date + optional xml_data/file_path)
      const xmlContent = loadXml(body);
      const samples = parseHealthExport(xmlContent);
      session = extractWorkoutSession(samples, body.date);

      if (!session) {
        return c.json({ error: "No workout session found for date" }, 400);
      }
    } else {
      return c.json({ error: "Provide hr_samples or date (with optional xml_data/file_path)" }, 400);
    }

    const attestation = analyzeWorkout(session);

    // Build HR timeline for frontend chart (downsample to ~150 points)
    const step = Math.max(1, Math.floor(session.samples.length / 150));
    const hr_timeline = session.samples
      .filter((_: unknown, i: number) => i % step === 0)
      .map((s) => ({ time: s.timestamp.toISOString(), bpm: Math.round(s.bpm) }));

    return c.json({
      attestation,
      session_info: {
        start: session.startDate.toISOString(),
        end: session.endDate.toISOString(),
        sample_count: session.samples.length,
        duration_mins: session.durationMins,
      },
      hr_timeline,
    });
  } catch (err: any) {
    return c.json({ error: `Analysis failed: ${err.message}` }, 500);
  }
});

export default app;
