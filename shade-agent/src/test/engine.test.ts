import { describe, test } from "node:test";
import assert from "node:assert";
import { analyzeWorkout } from "../engine/attestation-engine.js";
import {
  parseHealthExport,
  extractWorkoutSession,
} from "../parser/health-export-parser.js";
import type { WorkoutSession, HRSample } from "../types.js";

// --- Mock data generators ---

function generateRealisticWorkout(): WorkoutSession {
  const samples: HRSample[] = [];
  const baseTime = new Date("2026-02-14T12:29:00Z");

  // Warmup (0-5 min): 93 -> 120 bpm
  for (let i = 0; i < 60; i++) {
    samples.push({
      timestamp: new Date(baseTime.getTime() + i * 5000),
      bpm: 93 + (i / 60) * 27 + (Math.random() * 4 - 2),
      source: "Apple Watch",
    });
  }
  // Cardio (5-20 min): 150 -> 177 bpm
  for (let i = 60; i < 240; i++) {
    samples.push({
      timestamp: new Date(baseTime.getTime() + i * 5000),
      bpm: 155 + Math.sin(i * 0.1) * 15 + (Math.random() * 6 - 3),
      source: "Apple Watch",
    });
  }
  // Cooldown (20-25 min): 177 -> 135 bpm
  for (let i = 240; i < 300; i++) {
    const progress = (i - 240) / 60;
    samples.push({
      timestamp: new Date(baseTime.getTime() + i * 5000),
      bpm: 177 - progress * 42 + (Math.random() * 4 - 2),
      source: "Apple Watch",
    });
  }

  return {
    startDate: baseTime,
    endDate: new Date(baseTime.getTime() + 300 * 5000),
    samples,
    durationMins: 25,
  };
}

function generateSpoofedFlat(): WorkoutSession {
  const baseTime = new Date("2026-02-14T14:00:00Z");
  const samples: HRSample[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: new Date(baseTime.getTime() + i * 18000),
    bpm: 150 + (Math.random() * 0.5 - 0.25),
    source: "Fake",
  }));

  return {
    startDate: baseTime,
    endDate: new Date(baseTime.getTime() + 100 * 18000),
    samples,
    durationMins: 30,
  };
}

// --- Tests ---

describe("Attestation Engine", () => {
  const realWorkout = generateRealisticWorkout();

  test("analyzes real workout pattern correctly", () => {
    const result = analyzeWorkout(realWorkout);

    assert.strictEqual(result.activity_type, "high_intensity_cardio");
    assert.strictEqual(result.duration_mins, 25);
    assert.ok(result.avg_hr > 120, `avg_hr ${result.avg_hr} should be > 120`);
    assert.ok(result.max_hr > 160, `max_hr ${result.max_hr} should be > 160`);
    assert.ok(result.confidence > 60, `confidence ${result.confidence} should be > 60`);
    assert.strictEqual(result.analysis.is_natural_pattern, true);
    assert.strictEqual(result.analysis.has_warmup, true);
  });

  test("detects spoofed flat HR data", () => {
    const result = analyzeWorkout(generateSpoofedFlat());

    assert.ok(result.confidence < 50, `confidence ${result.confidence} should be < 50`);
    assert.ok(result.analysis.variability_score < 20, `variability ${result.analysis.variability_score} should be < 20`);
    assert.strictEqual(result.analysis.has_warmup, false);
  });

  test("confidence scales with duration", () => {
    const short = { ...realWorkout, durationMins: 5 };
    const long = { ...realWorkout, durationMins: 30 };

    const shortResult = analyzeWorkout(short);
    const longResult = analyzeWorkout(long);
    assert.ok(longResult.confidence > shortResult.confidence,
      `long confidence ${longResult.confidence} should be > short ${shortResult.confidence}`);
  });

  test("HR zone distribution sums to ~100%", () => {
    const result = analyzeWorkout(realWorkout);
    const zones = result.hr_zone_distribution;
    const sum =
      zones.zone1_rest +
      zones.zone2_light +
      zones.zone3_moderate +
      zones.zone4_vigorous +
      zones.zone5_max;
    assert.ok(sum >= 95, `zone sum ${sum} should be >= 95`);
    assert.ok(sum <= 105, `zone sum ${sum} should be <= 105`);
  });

  test("data hash is deterministic", () => {
    const fixedSamples: HRSample[] = [
      { timestamp: new Date("2026-02-14T12:30:00Z"), bpm: 142, source: "AW" },
      { timestamp: new Date("2026-02-14T12:30:05Z"), bpm: 145, source: "AW" },
      { timestamp: new Date("2026-02-14T12:30:10Z"), bpm: 150, source: "AW" },
    ];
    const session: WorkoutSession = {
      startDate: fixedSamples[0].timestamp,
      endDate: fixedSamples[fixedSamples.length - 1].timestamp,
      samples: fixedSamples,
      durationMins: 1,
    };

    const r1 = analyzeWorkout(session);
    const r2 = analyzeWorkout(session);
    assert.strictEqual(r1.data_hash, r2.data_hash);
    assert.strictEqual(r1.data_hash.length, 64);
  });

  test("recovery score is computed when peak is not at end", () => {
    const result = analyzeWorkout(realWorkout);
    assert.ok(result.recovery_score > 0, `recovery_score ${result.recovery_score} should be > 0`);
  });
});

describe("Health Export Parser", () => {
  test("parses Apple Health XML format", () => {
    const xml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-02-14 12:30:00 -0500" value="142" sourceName="Apple Watch"/>
        <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-02-14 12:30:05 -0500" value="145" sourceName="Apple Watch"/>
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-02-14 12:30:00 -0500" value="15" sourceName="iPhone"/>
      </HealthData>
    `;
    const samples = parseHealthExport(xml);
    assert.strictEqual(samples.length, 2);
    assert.strictEqual(samples[0].bpm, 142);
    assert.strictEqual(samples[1].bpm, 145);
    assert.strictEqual(samples[0].source, "Apple Watch");
  });

  test("returns empty array for no HR records", () => {
    const xml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-02-14 12:30:00 -0500" value="15" sourceName="iPhone"/>
      </HealthData>
    `;
    const samples = parseHealthExport(xml);
    assert.strictEqual(samples.length, 0);
  });

  test("returns empty array for empty XML", () => {
    const samples = parseHealthExport("<HealthData></HealthData>");
    assert.strictEqual(samples.length, 0);
  });

  test("extracts workout session from dense samples", () => {
    const samples: HRSample[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(`2026-02-14T12:${String(Math.floor(i * 5 / 60)).padStart(2, "0")}:${String((i * 5) % 60).padStart(2, "0")}Z`),
      bpm: 130 + Math.sin(i * 0.1) * 20,
      source: "Apple Watch",
    }));

    const session = extractWorkoutSession(samples, "2026-02-14");
    assert.ok(session !== null, "session should not be null");
    assert.ok(session!.samples.length >= 10, `sample count ${session!.samples.length} should be >= 10`);
    assert.ok(session!.durationMins > 0, `duration ${session!.durationMins} should be > 0`);
  });

  test("returns null when no workout on date", () => {
    const samples: HRSample[] = [
      { timestamp: new Date("2026-02-13T12:30:00Z"), bpm: 142, source: "AW" },
    ];
    const session = extractWorkoutSession(samples, "2026-02-14");
    assert.strictEqual(session, null);
  });

  test("returns null for too few samples", () => {
    const samples: HRSample[] = Array.from({ length: 5 }, (_, i) => ({
      timestamp: new Date(`2026-02-14T12:30:${String(i * 5).padStart(2, "0")}Z`),
      bpm: 120,
      source: "AW",
    }));
    const session = extractWorkoutSession(samples, "2026-02-14");
    assert.strictEqual(session, null);
  });
});
