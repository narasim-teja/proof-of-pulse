import { XMLParser } from "fast-xml-parser";
import type { HRSample, WorkoutSession } from "../types";

/**
 * Parse Apple Health XML export and extract heart rate samples.
 * Uses fast-xml-parser (proven config from src/analyze.ts).
 */
export function parseHealthExport(xmlContent: string): HRSample[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const data = parser.parse(xmlContent);
  const records = data.HealthData?.Record;

  if (!records) return [];

  // Handle both single record and array of records
  const recordArray = Array.isArray(records) ? records : [records];

  const samples: HRSample[] = recordArray
    .filter((r: any) => r.type === "HKQuantityTypeIdentifierHeartRate")
    .map((r: any) => ({
      timestamp: new Date(r.startDate),
      bpm: parseFloat(r.value),
      source: r.sourceName || "Unknown",
    }));

  return samples.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
}

/**
 * Extract a workout session from HR samples for a given date.
 * Finds the longest contiguous run of dense, elevated-HR samples.
 *
 * Uses string matching on date (not Date object comparison) to avoid
 * timezone shift issues — same approach as src/workout.ts.
 */
export function extractWorkoutSession(
  samples: HRSample[],
  date: string // "YYYY-MM-DD"
): WorkoutSession | null {
  // Filter samples to the given date using string matching on the original timestamp
  // Since we converted to Date objects, we use toISOString date portion
  // But Apple Health uses local time, so also check the original date string format
  const daySamples = samples.filter((s) => {
    const isoDate = s.timestamp.toISOString().split("T")[0];
    // Also check local date representation to handle timezone edge cases
    const localDate = `${s.timestamp.getFullYear()}-${String(s.timestamp.getMonth() + 1).padStart(2, "0")}-${String(s.timestamp.getDate()).padStart(2, "0")}`;
    return isoDate === date || localDate === date;
  });

  if (daySamples.length < 10) return null;

  // Find contiguous runs of dense-sampling, elevated-HR samples
  // A "run" = consecutive samples where gap < 15s AND bpm > 90
  const MAX_GAP_MS = 15000;
  const MIN_BPM = 90;

  interface Run {
    startIdx: number;
    endIdx: number;
    length: number;
  }

  const runs: Run[] = [];
  let runStart = -1;

  for (let i = 0; i < daySamples.length; i++) {
    if (daySamples[i].bpm > MIN_BPM) {
      if (runStart === -1) {
        runStart = i;
      } else {
        // Check gap from previous sample
        const gap =
          daySamples[i].timestamp.getTime() -
          daySamples[i - 1].timestamp.getTime();
        if (gap > MAX_GAP_MS) {
          // End previous run, start new one
          if (i - 1 > runStart) {
            runs.push({
              startIdx: runStart,
              endIdx: i - 1,
              length: i - 1 - runStart + 1,
            });
          }
          runStart = i;
        }
      }
    } else {
      // HR dropped below threshold — end run
      if (runStart !== -1 && i - 1 >= runStart) {
        runs.push({
          startIdx: runStart,
          endIdx: i - 1,
          length: i - 1 - runStart + 1,
        });
      }
      runStart = -1;
    }
  }

  // Close final run if still open
  if (runStart !== -1 && daySamples.length - 1 >= runStart) {
    runs.push({
      startIdx: runStart,
      endIdx: daySamples.length - 1,
      length: daySamples.length - 1 - runStart + 1,
    });
  }

  if (runs.length === 0) return null;

  // Pick the longest run (most likely the actual workout)
  const longest = runs.reduce((best, run) =>
    run.length > best.length ? run : best
  );

  if (longest.length < 10) return null;

  const sessionSamples = daySamples.slice(longest.startIdx, longest.endIdx + 1);

  const startDate = sessionSamples[0].timestamp;
  const endDate = sessionSamples[sessionSamples.length - 1].timestamp;
  const durationMins = Math.round(
    (endDate.getTime() - startDate.getTime()) / 60000
  );

  return {
    startDate,
    endDate,
    samples: sessionSamples,
    durationMins,
  };
}
