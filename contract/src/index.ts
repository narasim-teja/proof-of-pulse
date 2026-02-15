import { NearBindgen, near, call, view, LookupMap } from "near-sdk-js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

@NearBindgen({})
export class ProofOfPulse {
  oracle_id: string = "";
  attestations: LookupMap<string> = new LookupMap<string>("a");

  @call({ payableFunction: false })
  init({ oracle_id }: { oracle_id: string }): void {
    this.oracle_id = oracle_id;
  }

  @call({ payableFunction: false })
  submit_attestation({
    user_id,
    activity_type,
    duration_mins,
    avg_hr,
    max_hr,
    min_hr,
    hr_zone_distribution,
    recovery_score,
    confidence,
    data_hash,
    nova_vault_id,
  }: {
    user_id: string;
    activity_type: string;
    duration_mins: number;
    avg_hr: number;
    max_hr: number;
    min_hr: number;
    hr_zone_distribution: string;
    recovery_score: number;
    confidence: number;
    data_hash: string;
    nova_vault_id: string;
  }): string {
    assert(
      near.predecessorAccountId() === this.oracle_id,
      "Only authorized oracle can submit attestations"
    );
    assert(confidence >= 0 && confidence <= 100, "Confidence must be 0-100");

    const attestation = {
      user_id,
      activity_type,
      duration_mins,
      avg_hr,
      max_hr,
      min_hr,
      hr_zone_distribution,
      recovery_score,
      confidence,
      data_hash,
      nova_vault_id,
      timestamp: near.blockTimestamp().toString(),
      block_height: near.blockHeight().toString(),
    };

    const key = `${user_id}:${near.blockTimestamp()}`;
    this.attestations.set(key, JSON.stringify(attestation));

    near.log(
      `Attestation stored for ${user_id}: ${activity_type}, confidence=${confidence}`
    );

    return key;
  }

  @view({})
  get_attestation({ key }: { key: string }): string | null {
    return this.attestations.get(key);
  }

  @view({})
  verify_attestation({
    key,
    min_confidence,
  }: {
    key: string;
    min_confidence: number;
  }): boolean {
    const raw = this.attestations.get(key);
    if (!raw) return false;
    const att = JSON.parse(raw);
    return att.confidence >= min_confidence;
  }

  @view({})
  get_oracle(): string {
    return this.oracle_id;
  }
}
