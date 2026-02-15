import { NearBindgen, near, call, view, LookupMap } from "near-sdk-js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

@NearBindgen({})
export class ProofOfPulse {
  owner_id: string = "";
  oracle_id: string = "";
  oracles: LookupMap<string> = new LookupMap<string>("o");
  oracle_ids: string = "[]";
  attestations: LookupMap<string> = new LookupMap<string>("a");
  pending_requests: LookupMap<string> = new LookupMap<string>("p");
  pending_ids: string = "[]";
  request_count: number = 0;

  @call({ payableFunction: false })
  init({ oracle_id }: { oracle_id: string }): void {
    this.owner_id = near.predecessorAccountId();
    this.oracle_id = oracle_id;
    // Seed the first oracle into the multi-oracle map
    this.oracles.set(oracle_id, "v1");
    this.oracle_ids = JSON.stringify([oracle_id]);
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
    const caller = near.predecessorAccountId();
    assert(
      caller === this.oracle_id || this.oracles.get(caller) !== null,
      "Not an authorized oracle"
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
      oracle_version: this.oracles.get(caller) || "v1",
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

  // ── Named account oracle management ──

  @call({ payableFunction: false })
  add_oracle({
    oracle_id,
    version,
  }: {
    oracle_id: string;
    version: string;
  }): void {
    assert(
      near.predecessorAccountId() === this.owner_id,
      "Only owner can add oracles"
    );
    this.oracles.set(oracle_id, version);
    const ids: string[] = JSON.parse(this.oracle_ids);
    if (!ids.includes(oracle_id)) {
      ids.push(oracle_id);
      this.oracle_ids = JSON.stringify(ids);
    }
    near.log(`Oracle added: ${oracle_id} (${version})`);
  }

  @call({ payableFunction: false })
  remove_oracle({ oracle_id }: { oracle_id: string }): void {
    assert(
      near.predecessorAccountId() === this.owner_id,
      "Only owner can remove oracles"
    );
    assert(oracle_id !== this.oracle_id, "Cannot remove primary oracle");
    this.oracles.set(oracle_id, null!);
    const ids: string[] = JSON.parse(this.oracle_ids);
    this.oracle_ids = JSON.stringify(ids.filter((id) => id !== oracle_id));
    near.log(`Oracle removed: ${oracle_id}`);
  }

  @view({})
  get_oracles(): object[] {
    const ids: string[] = JSON.parse(this.oracle_ids);
    return ids.map((id) => ({
      oracle_id: id,
      version: this.oracles.get(id) || "unknown",
    }));
  }

  @view({})
  is_authorized_oracle({ account_id }: { account_id: string }): boolean {
    return account_id === this.oracle_id || this.oracles.get(account_id) !== null;
  }

  // ── Async attestation flow (event-based yield/resume alternative) ──

  @call({ payableFunction: false })
  request_attestation({ data_hash }: { data_hash: string }): string {
    const request_id = `req_${this.request_count}`;
    this.request_count += 1;
    const user_id = near.predecessorAccountId();

    const request = JSON.stringify({
      user_id,
      data_hash,
      timestamp: near.blockTimestamp().toString(),
      status: "pending",
    });

    this.pending_requests.set(request_id, request);

    // Track ID for enumeration
    const ids: string[] = JSON.parse(this.pending_ids);
    ids.push(request_id);
    this.pending_ids = JSON.stringify(ids);

    near.log(
      JSON.stringify({
        standard: "proof-of-pulse",
        version: "1.0.0",
        event: "attestation_requested",
        data: { request_id, user_id, data_hash },
      })
    );

    return request_id;
  }

  @view({})
  get_pending_requests(): object[] {
    const ids: string[] = JSON.parse(this.pending_ids);
    const results: object[] = [];
    for (const id of ids) {
      const raw = this.pending_requests.get(id);
      if (raw) {
        results.push({ request_id: id, ...JSON.parse(raw) });
      }
    }
    return results;
  }

  @view({})
  get_request_status({ request_id }: { request_id: string }): string | null {
    return this.pending_requests.get(request_id);
  }

  @call({ payableFunction: false })
  fulfill_attestation({
    request_id,
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
    request_id: string;
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
    const caller = near.predecessorAccountId();
    assert(
      caller === this.oracle_id || this.oracles.get(caller) !== null,
      "Not an authorized oracle"
    );

    const pendingRaw = this.pending_requests.get(request_id);
    assert(pendingRaw !== null, "No pending request found");

    // Remove from pending
    this.pending_requests.set(request_id, null!);
    const ids: string[] = JSON.parse(this.pending_ids);
    this.pending_ids = JSON.stringify(ids.filter((id) => id !== request_id));

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
      request_id,
      fulfilled_by: near.predecessorAccountId(),
      timestamp: near.blockTimestamp().toString(),
      block_height: near.blockHeight().toString(),
    };

    const key = `${user_id}:${near.blockTimestamp()}`;
    this.attestations.set(key, JSON.stringify(attestation));

    near.log(
      JSON.stringify({
        standard: "proof-of-pulse",
        version: "1.0.0",
        event: "attestation_fulfilled",
        data: { request_id, key, user_id, confidence },
      })
    );

    return key;
  }
}
