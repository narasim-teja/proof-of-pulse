import { NearBindgen, near, call, view, NearPromise } from "near-sdk-js";

const ATTESTATION_CONTRACT = "proof-of-pulse.testnet";
const GAS = BigInt("30000000000000"); // 30 TGas

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

@NearBindgen({})
class SweatReward {
  total_rewards_granted: number = 0;

  @call({ payableFunction: false })
  claim_reward({ attestation_key }: { attestation_key: string }): NearPromise {
    const claimer = near.predecessorAccountId();

    // Cross-contract call to verify the attestation meets confidence threshold
    return NearPromise.new(ATTESTATION_CONTRACT)
      .functionCall(
        "verify_attestation",
        JSON.stringify({ key: attestation_key, min_confidence: 80 }),
        BigInt(0),
        GAS
      )
      .then(
        NearPromise.new(near.currentAccountId()).functionCall(
          "on_verification_complete",
          JSON.stringify({ attestation_key, claimer }),
          BigInt(0),
          GAS
        )
      );
  }

  @call({ privateFunction: true })
  on_verification_complete({
    attestation_key,
    claimer,
  }: {
    attestation_key: string;
    claimer: string;
  }): string {
    const result = near.promiseResult(0);
    const verified = JSON.parse(result);

    if (verified === true) {
      this.total_rewards_granted += 1;

      near.log(
        JSON.stringify({
          standard: "mock-sweatcoin",
          version: "1.0.0",
          event: "reward_granted",
          data: {
            claimer,
            tokens: "10 SWEAT",
            attestation_key,
            total_rewards: this.total_rewards_granted,
          },
        })
      );

      return JSON.stringify({
        status: "rewarded",
        claimer,
        tokens: "10 SWEAT",
        attestation_key,
      });
    } else {
      near.log(
        JSON.stringify({
          standard: "mock-sweatcoin",
          version: "1.0.0",
          event: "reward_rejected",
          data: {
            claimer,
            attestation_key,
            reason: "Confidence below 80%",
          },
        })
      );

      return JSON.stringify({
        status: "rejected",
        reason: "Confidence below 80%",
      });
    }
  }

  @view({})
  get_total_rewards(): number {
    return this.total_rewards_granted;
  }
}
