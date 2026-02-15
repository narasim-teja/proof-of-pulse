// workout-analysis.ts
import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const xml = readFileSync("./data/export.xml", "utf-8");
console.log("Parsing...");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

const data = parser.parse(xml);
const records = data.HealthData.Record;

// Filter for today's data only
const today = "2026-02-14";
const todayHR = records.filter(
  (r: any) =>
    r.type === "HKQuantityTypeIdentifierHeartRate" &&
    r.startDate?.includes(today)
);

console.log(`\n=== TODAY'S HEART RATE DATA ===`);
console.log(`Samples today: ${todayHR.length}`);

if (todayHR.length > 0) {
  const hrValues = todayHR.map((r: any) => parseFloat(r.value));
  console.log(`Min: ${Math.min(...hrValues)} bpm`);
  console.log(`Max: ${Math.max(...hrValues)} bpm`);
  console.log(
    `Avg: ${(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length).toFixed(1)} bpm`
  );
  console.log(`First: ${todayHR[0].startDate}`);
  console.log(`Last: ${todayHR[todayHR.length - 1].startDate}`);

  // Sampling intervals
  const intervals: number[] = [];
  for (let i = 1; i < todayHR.length; i++) {
    const diff =
      new Date(todayHR[i].startDate).getTime() -
      new Date(todayHR[i - 1].startDate).getTime();
    intervals.push(diff / 1000);
  }

  if (intervals.length > 0) {
    console.log(`\n--- Sampling Intervals ---`);
    console.log(`Min interval: ${Math.min(...intervals).toFixed(1)}s`);
    console.log(`Max interval: ${Math.max(...intervals).toFixed(1)}s`);
    console.log(
      `Avg interval: ${(intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1)}s`
    );

    // Find dense clusters (workout periods where interval < 10s)
    const denseIntervals = intervals.filter((i) => i < 10);
    console.log(
      `\nDense samples (<10s interval): ${denseIntervals.length} out of ${intervals.length}`
    );
    if (denseIntervals.length > 0) {
      console.log(
        `Avg dense interval: ${(denseIntervals.reduce((a, b) => a + b, 0) / denseIntervals.length).toFixed(1)}s`
      );
    }
  }

  // Print timeline with HR values
  console.log(`\n--- Timeline (every sample) ---`);
  todayHR.forEach((r: any) => {
    const time = r.startDate.split(" ")[1];
    const hr = parseFloat(r.value).toFixed(0);
    console.log(`  ${time} → ${hr} bpm`);
  });
}

// Today's HRV
const todayHRV = records.filter(
  (r: any) =>
    r.type === "HKQuantityTypeIdentifierHeartRateVariabilitySDNN" &&
    r.startDate?.includes(today)
);
console.log(`\n=== TODAY'S HRV ===`);
console.log(`HRV samples today: ${todayHRV.length}`);
todayHRV.forEach((r: any) => {
  const time = r.startDate.split(" ")[1];
  console.log(`  ${time} → ${parseFloat(r.value).toFixed(1)} ms`);
});

// Check workouts
const workouts = data.HealthData.Workout;
if (workouts) {
  const todayWorkouts = (Array.isArray(workouts) ? workouts : [workouts]).filter(
    (w: any) => w.startDate?.includes(today)
  );
  console.log(`\n=== TODAY'S WORKOUTS ===`);
  console.log(`Workouts today: ${todayWorkouts.length}`);
  todayWorkouts.forEach((w: any) => {
    console.log(`  Type: ${w.workoutActivityType}`);
    console.log(`  Start: ${w.startDate}`);
    console.log(`  End: ${w.endDate}`);
    console.log(`  Duration: ${(parseFloat(w.duration) / 60).toFixed(1)} min`);
  });
}

// Check for today's SpO2 and respiratory rate
const todaySpO2 = records.filter(
  (r: any) =>
    r.type === "HKQuantityTypeIdentifierOxygenSaturation" &&
    r.startDate?.includes(today)
);
const todayResp = records.filter(
  (r: any) =>
    r.type === "HKQuantityTypeIdentifierRespiratoryRate" &&
    r.startDate?.includes(today)
);
console.log(`\n=== OTHER BIOMETRICS TODAY ===`);
console.log(`SpO2 samples: ${todaySpO2.length}`);
console.log(`Respiratory rate samples: ${todayResp.length}`);