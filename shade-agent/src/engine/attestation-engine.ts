import { createHash } from "node:crypto";
import type {
  WorkoutSession,
  AttestationResult,
  HRZoneDistribution,
} from "../types";

/**
 * Analyze a workout session and produce a biometric attestation.
 * Pure function — no I/O, fully deterministic for same input.
 */
export function analyzeWorkout(session: WorkoutSession): AttestationResult {
  const { samples, durationMins } = session;
  const bpms = samples.map((s) => s.bpm);

  // ---- Basic Stats ----
  const avg_hr = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
  const max_hr = Math.max(...bpms);
  const min_hr = Math.min(...bpms);

  // ---- HR Zone Distribution ----
  const zones: HRZoneDistribution = {
    zone1_rest: 0,
    zone2_light: 0,
    zone3_moderate: 0,
    zone4_vigorous: 0,
    zone5_max: 0,
  };

  for (const bpm of bpms) {
    if (bpm < 100) zones.zone1_rest++;
    else if (bpm < 120) zones.zone2_light++;
    else if (bpm < 140) zones.zone3_moderate++;
    else if (bpm < 160) zones.zone4_vigorous++;
    else zones.zone5_max++;
  }

  const total = bpms.length;
  zones.zone1_rest = Math.round((zones.zone1_rest / total) * 100);
  zones.zone2_light = Math.round((zones.zone2_light / total) * 100);
  zones.zone3_moderate = Math.round((zones.zone3_moderate / total) * 100);
  zones.zone4_vigorous = Math.round((zones.zone4_vigorous / total) * 100);
  zones.zone5_max = Math.round((zones.zone5_max / total) * 100);

  // ---- Natural Pattern Detection ----
  // Warmup: first 20% of samples should show HR increase
  const warmupSlice = bpms.slice(0, Math.floor(bpms.length * 0.2));
  const has_warmup =
    warmupSlice.length > 2 &&
    warmupSlice[warmupSlice.length - 1] - warmupSlice[0] > 20;

  // Cooldown: last 15% should show HR decrease
  const cooldownSlice = bpms.slice(Math.floor(bpms.length * 0.85));
  const has_cooldown =
    cooldownSlice.length > 2 &&
    cooldownSlice[0] - cooldownSlice[cooldownSlice.length - 1] > 15;

  // ---- Variability Score ----
  // Real exercise has beat-to-beat variation; spoofed data is flat
  let diffs = 0;
  for (let i = 1; i < bpms.length; i++) {
    diffs += Math.abs(bpms[i] - bpms[i - 1]);
  }
  const avgDiff = diffs / (bpms.length - 1);
  // Natural exercise: avgDiff 2-8 bpm between consecutive readings
  // Flat/spoofed: avgDiff < 1 or > 15 (erratic)
  const variability_score = Math.min(
    100,
    Math.max(0, avgDiff > 1 && avgDiff < 12 ? avgDiff * 15 : 10)
  );

  // ---- Sampling Density ----
  const sampling_density = durationMins > 0 ? samples.length / durationMins : 0;

  // ---- Natural Pattern ----
  const is_natural_pattern =
    has_warmup &&
    variability_score > 30 &&
    max_hr - min_hr > 40 &&
    sampling_density > 3;

  // ---- Recovery Score ----
  // How quickly HR drops after peak
  const peakIndex = bpms.indexOf(max_hr);
  let recovery_score = 0;
  if (peakIndex < bpms.length - 5) {
    const postPeak = bpms.slice(peakIndex, peakIndex + 10);
    if (postPeak.length >= 2) {
      const drop = postPeak[0] - postPeak[postPeak.length - 1];
      recovery_score = Math.min(100, Math.max(0, drop * 2));
    }
  }

  // ---- Confidence Score ----
  let confidence = 0;
  // Duration factor (longer = more confidence, max at 20+ mins)
  confidence += Math.min(25, (durationMins / 20) * 25);
  // Natural pattern
  confidence += is_natural_pattern ? 25 : 5;
  // Variability
  confidence += Math.min(20, variability_score * 0.2);
  // Sampling density (more samples = harder to fake)
  confidence += Math.min(15, sampling_density * 2);
  // HR range (wider range = more likely real exercise)
  confidence += Math.min(15, ((max_hr - min_hr) / 80) * 15);
  confidence = Math.round(Math.min(100, Math.max(0, confidence)));

  // ---- Activity Type ----
  let activity_type = "unknown";
  if (avg_hr > 140 && max_hr > 160) activity_type = "high_intensity_cardio";
  else if (avg_hr > 120) activity_type = "moderate_cardio";
  else if (avg_hr > 100) activity_type = "light_activity";

  // ---- Data Hash (SHA-256) ----
  const dataString = samples
    .map((s) => `${s.timestamp.toISOString()}:${s.bpm}`)
    .join(",");
  const data_hash = createHash("sha256").update(dataString).digest("hex");

  return {
    activity_type,
    duration_mins: durationMins,
    avg_hr,
    max_hr,
    min_hr,
    hr_zone_distribution: zones,
    recovery_score,
    confidence,
    analysis: {
      is_natural_pattern,
      has_warmup,
      has_cooldown,
      variability_score: Math.round(variability_score),
      sampling_density: Math.round(sampling_density * 10) / 10,
    },
    data_hash,
  };
}
