export interface HRSample {
  timestamp: Date;
  bpm: number;
  source: string;
}

export interface WorkoutSession {
  startDate: Date;
  endDate: Date;
  samples: HRSample[];
  durationMins: number;
}

export interface HRZoneDistribution {
  zone1_rest: number; // < 100 bpm (% of time)
  zone2_light: number; // 100-120 bpm
  zone3_moderate: number; // 120-140 bpm
  zone4_vigorous: number; // 140-160 bpm
  zone5_max: number; // > 160 bpm
}

export interface AttestationAnalysis {
  is_natural_pattern: boolean;
  has_warmup: boolean;
  has_cooldown: boolean;
  variability_score: number; // 0-100
  sampling_density: number; // samples per minute
}

export interface AttestationResult {
  activity_type: string;
  duration_mins: number;
  avg_hr: number;
  max_hr: number;
  min_hr: number;
  hr_zone_distribution: HRZoneDistribution;
  recovery_score: number;
  confidence: number;
  analysis: AttestationAnalysis;
  data_hash: string;
}
