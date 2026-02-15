import { describe, test, expect } from "bun:test";
import { analyzeWorkout } from "../engine/attestation-engine";
import {
  parseHealthExport,
  extractWorkoutSession,
} from "../parser/health-export-parser";
import type { WorkoutSession, HRSample } from "../types";

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
    bpm: 150 + (Math.random() * 0.5 - 0.25), // almost flat
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

    expect(result.activity_type).toBe("high_intensity_cardio");
    expect(result.duration_mins).toBe(25);
    expect(result.avg_hr).toBeGreaterThan(120);
    expect(result.max_hr).toBeGreaterThan(160);
    expect(result.confidence).toBeGreaterThan(70);
    expect(result.analysis.is_natural_pattern).toBe(true);
    expect(result.analysis.has_warmup).toBe(true);
  });

  test("detects spoofed flat HR data", () => {
    const result = analyzeWorkout(generateSpoofedFlat());

    expect(result.confidence).toBeLessThan(50);
    expect(result.analysis.variability_score).toBeLessThan(20);
    expect(result.analysis.has_warmup).toBe(false);
  });

  test("confidence scales with duration", () => {
    const short = { ...realWorkout, durationMins: 5 };
    const long = { ...realWorkout, durationMins: 30 };

    const shortResult = analyzeWorkout(short);
    const longResult = analyzeWorkout(long);
    expect(longResult.confidence).toBeGreaterThan(shortResult.confidence);
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
    expect(sum).toBeGreaterThanOrEqual(95);
    expect(sum).toBeLessThanOrEqual(105); // rounding tolerance
  });

  test("data hash is deterministic", () => {
    // Use fixed samples (no randomness)
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
    expect(r1.data_hash).toBe(r2.data_hash);
    expect(r1.data_hash.length).toBe(64); // SHA-256 hex = 64 chars
  });

  test("recovery score is computed when peak is not at end", () => {
    const result = analyzeWorkout(realWorkout);
    // Real workout has cooldown after peak — recovery score should be > 0
    expect(result.recovery_score).toBeGreaterThan(0);
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
    expect(samples.length).toBe(2);
    expect(samples[0].bpm).toBe(142);
    expect(samples[1].bpm).toBe(145);
    expect(samples[0].source).toBe("Apple Watch");
  });

  test("returns empty array for no HR records", () => {
    const xml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-02-14 12:30:00 -0500" value="15" sourceName="iPhone"/>
      </HealthData>
    `;
    const samples = parseHealthExport(xml);
    expect(samples.length).toBe(0);
  });

  test("returns empty array for empty XML", () => {
    const samples = parseHealthExport("<HealthData></HealthData>");
    expect(samples.length).toBe(0);
  });

  test("extracts workout session from dense samples", () => {
    // Generate 100 samples at 5s intervals, all > 100 bpm
    const samples: HRSample[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(`2026-02-14T12:${String(Math.floor(i * 5 / 60)).padStart(2, "0")}:${String((i * 5) % 60).padStart(2, "0")}Z`),
      bpm: 130 + Math.sin(i * 0.1) * 20,
      source: "Apple Watch",
    }));

    const session = extractWorkoutSession(samples, "2026-02-14");
    expect(session).not.toBeNull();
    expect(session!.samples.length).toBeGreaterThanOrEqual(10);
    expect(session!.durationMins).toBeGreaterThan(0);
  });

  test("returns null when no workout on date", () => {
    const samples: HRSample[] = [
      { timestamp: new Date("2026-02-13T12:30:00Z"), bpm: 142, source: "AW" },
    ];
    const session = extractWorkoutSession(samples, "2026-02-14");
    expect(session).toBeNull();
  });

  test("returns null for too few samples", () => {
    const samples: HRSample[] = Array.from({ length: 5 }, (_, i) => ({
      timestamp: new Date(`2026-02-14T12:30:${String(i * 5).padStart(2, "0")}Z`),
      bpm: 120,
      source: "AW",
    }));
    const session = extractWorkoutSession(samples, "2026-02-14");
    expect(session).toBeNull();
  });
});
