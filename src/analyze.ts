// analyze.ts
import { readFileSync } from "fs";

// We'll use a streaming XML parser since 70mb is big
// bun add fast-xml-parser

import { XMLParser } from "fast-xml-parser";

const xml = readFileSync("./data/export.xml", "utf-8");

console.log("Parsing XML... (this might take a minute)");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

const data = parser.parse(xml);

const records = data.HealthData.Record;

// Filter heart-related records
const heartRate = records.filter(
  (r: any) => r.type === "HKQuantityTypeIdentifierHeartRate"
);
const hrv = records.filter(
  (r: any) => r.type === "HKQuantityTypeIdentifierHeartRateVariabilitySDNN"
);
const restingHR = records.filter(
  (r: any) => r.type === "HKQuantityTypeIdentifierRestingHeartRate"
);

console.log("\n=== PROOF OF PULSE DATA ANALYSIS ===\n");
console.log(`Total records in export: ${records.length}`);
console.log(`Heart Rate samples: ${heartRate.length}`);
console.log(`HRV (SDNN) samples: ${hrv.length}`);
console.log(`Resting HR samples: ${restingHR.length}`);

// Heart rate analysis
if (heartRate.length > 0) {
  const hrValues = heartRate.map((r: any) => parseFloat(r.value));
  const min = Math.min(...hrValues);
  const max = Math.max(...hrValues);
  const avg = hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length;

  console.log("\n--- Heart Rate ---");
  console.log(`Min: ${min} bpm`);
  console.log(`Max: ${max} bpm`);
  console.log(`Avg: ${avg.toFixed(1)} bpm`);
  console.log(`Date range: ${heartRate[0].startDate} → ${heartRate[heartRate.length - 1].startDate}`);

  // Check sampling frequency during most recent workout
  const last50 = heartRate.slice(-50);
  const intervals = [];
  for (let i = 1; i < last50.length; i++) {
    const diff =
      new Date(last50[i].startDate).getTime() -
      new Date(last50[i - 1].startDate).getTime();
    intervals.push(diff / 1000); // seconds
  }
  const avgInterval =
    intervals.reduce((a, b) => a + b, 0) / intervals.length;
  console.log(
    `Avg sampling interval (last 50 samples): ${avgInterval.toFixed(1)}s`
  );
}

// HRV analysis
if (hrv.length > 0) {
  const hrvValues = hrv.map((r: any) => parseFloat(r.value));
  const min = Math.min(...hrvValues);
  const max = Math.max(...hrvValues);
  const avg =
    hrvValues.reduce((a: number, b: number) => a + b, 0) / hrvValues.length;

  console.log("\n--- HRV (SDNN) ---");
  console.log(`Min: ${min} ms`);
  console.log(`Max: ${max} ms`);
  console.log(`Avg: ${avg.toFixed(1)} ms`);
  console.log(`Samples: ${hrv.length}`);
}

// Check for heartbeat series (beat-to-beat intervals)
const heartbeatSeries = records.filter(
  (r: any) => r.type === "HKDataTypeIdentifierHeartbeatSeries"
);
console.log(`\n--- Heartbeat Series ---`);
console.log(`Heartbeat series records: ${heartbeatSeries.length}`);

// List all unique health data types (to see what else is available)
const types = new Set(records.map((r: any) => r.type));
console.log("\n--- All Available Data Types ---");
types.forEach((t) => console.log(`  ${t}`));