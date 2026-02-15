import { Worker, Account } from "near-workspaces";
import test from "ava";

let worker: Worker;
let contract: Account;
let oracle: Account;
let user: Account;

test.before(async () => {
  worker = await Worker.init();
  const root = worker.rootAccount;
  contract = await root.createSubAccount("contract");
  oracle = await root.createSubAccount("oracle");
  user = await root.createSubAccount("user");

  await contract.deploy("./build/proof_of_pulse.wasm");
  await contract.call(contract, "init", { oracle_id: oracle.accountId });
});

test.after.always(async () => {
  await worker.tearDown();
});

test.serial("submit and retrieve attestation", async (t) => {
  const result = await oracle.call(contract, "submit_attestation", {
    user_id: user.accountId,
    activity_type: "cardio",
    duration_mins: 25,
    avg_hr: 156,
    max_hr: 177,
    min_hr: 93,
    hr_zone_distribution:
      '{"zone1":5,"zone2":15,"zone3":40,"zone4":35,"zone5":5}',
    recovery_score: 82,
    confidence: 95,
    data_hash: "abc123hash",
    nova_vault_id: "vault_001",
  });

  const attestation = await contract.view("get_attestation", {
    key: result,
  });
  const parsed = JSON.parse(attestation as string);
  t.is(parsed.user_id, user.accountId);
  t.is(parsed.confidence, 95);
  t.is(parsed.max_hr, 177);
});

test.serial("verify attestation with min confidence", async (t) => {
  const key = await oracle.call(contract, "submit_attestation", {
    user_id: user.accountId,
    activity_type: "cardio",
    duration_mins: 25,
    avg_hr: 156,
    max_hr: 177,
    min_hr: 93,
    hr_zone_distribution: "{}",
    recovery_score: 82,
    confidence: 95,
    data_hash: "abc123hash",
    nova_vault_id: "vault_001",
  });

  const passes = await contract.view("verify_attestation", {
    key,
    min_confidence: 80,
  });
  t.is(passes, true);

  const fails = await contract.view("verify_attestation", {
    key,
    min_confidence: 99,
  });
  t.is(fails, false);
});

test.serial("only oracle can submit", async (t) => {
  await t.throwsAsync(
    user.call(contract, "submit_attestation", {
      user_id: user.accountId,
      activity_type: "cardio",
      duration_mins: 10,
      avg_hr: 120,
      max_hr: 140,
      min_hr: 80,
      hr_zone_distribution: "{}",
      recovery_score: 50,
      confidence: 70,
      data_hash: "xyz",
      nova_vault_id: "vault_002",
    })
  );
});
