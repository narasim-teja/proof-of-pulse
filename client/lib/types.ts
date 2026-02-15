export interface HRZoneDistribution {
  zone1_rest: number;
  zone2_light: number;
  zone3_moderate: number;
  zone4_vigorous: number;
  zone5_max: number;
}

export interface AttestationAnalysis {
  is_natural_pattern: boolean;
  has_warmup: boolean;
  has_cooldown: boolean;
  variability_score: number;
  sampling_density: number;
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

export interface SessionInfo {
  start: string;
  end: string;
  sample_count: number;
  duration_mins: number;
}

export interface HRTimelinePoint {
  time: string;
  bpm: number;
}

export interface AnalyzeResponse {
  attestation: AttestationResult;
  session_info: SessionInfo;
  hr_timeline: HRTimelinePoint[];
}

export interface NovaInfo {
  cid: string;
  file_hash: string;
  nova_tx: string;
  is_new_vault: boolean;
}

export interface AttestResponse {
  attestation: AttestationResult;
  hr_timeline: HRTimelinePoint[];
  near_tx: string;
  attestation_key: string;
  nova_vault_id: string;
  nova: NovaInfo | null;
  explorer_url: string;
}

export interface VaultFile {
  fileHash: string;
  ipfsHash: string;
  userId: string;
}

export interface VaultStatus {
  groupId: string;
  owner: string | null;
  isAuthorized: boolean;
  fileCount: number;
  files: VaultFile[];
}

export interface VaultResponse {
  vault: VaultStatus;
}
