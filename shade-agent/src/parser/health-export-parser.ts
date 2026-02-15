import { XMLParser } from "fast-xml-parser";
import type { HRSample, WorkoutSession } from "../types.js";

/**
 * Parse Apple Health XML export and extract heart rate samples.
 */
export function parseHealthExport(xmlContent: string): HRSample[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const data = parser.parse(xmlContent);
  const records = data.HealthData?.Record;

  if (!records) return [];

  const recordArray = Array.isArray(records) ? records : [records];

  const samples: HRSample[] = recordArray
    .filter((r: any) => r.type === "HKQuantityTypeIdentifierHeartRate")
    .map((r: any) => ({
      timestamp: new Date(r.startDate),
      bpm: parseFloat(r.value),
      source: r.sourceName || "Unknown",
    }));

  return samples.sort(
    (a: HRSample, b: HRSample) => a.timestamp.getTime() - b.timestamp.getTime()
  );
}

/**
 * Extract a workout session from HR samples for a given date.
 */
export function extractWorkoutSession(
  samples: HRSample[],
  date: string // "YYYY-MM-DD"
): WorkoutSession | null {
  const daySamples = samples.filter((s) => {
    const isoDate = s.timestamp.toISOString().split("T")[0];
    const localDate = `${s.timestamp.getFullYear()}-${String(s.timestamp.getMonth() + 1).padStart(2, "0")}-${String(s.timestamp.getDate()).padStart(2, "0")}`;
    return isoDate === date || localDate === date;
  });

  if (daySamples.length < 10) return null;

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
        const gap =
          daySamples[i].timestamp.getTime() -
          daySamples[i - 1].timestamp.getTime();
        if (gap > MAX_GAP_MS) {
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

  if (runStart !== -1 && daySamples.length - 1 >= runStart) {
    runs.push({
      startIdx: runStart,
      endIdx: daySamples.length - 1,
      length: daySamples.length - 1 - runStart + 1,
    });
  }

  if (runs.length === 0) return null;

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

  return { startDate, endDate, samples: sessionSamples, durationMins };
}
