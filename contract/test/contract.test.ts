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

// ── Async request/fulfill flow tests ──

test.serial("request and fulfill attestation", async (t) => {
  // User requests attestation
  const requestId = await user.call(contract, "request_attestation", {
    data_hash: "async_hash_123",
  });
  t.is(typeof requestId, "string");
  t.truthy((requestId as string).startsWith("req_"));

  // Check request status
  const status = await contract.view("get_request_status", {
    request_id: requestId,
  });
  const parsed = JSON.parse(status as string);
  t.is(parsed.status, "pending");
  t.is(parsed.user_id, user.accountId);

  // Oracle fulfills the request
  const key = await oracle.call(contract, "fulfill_attestation", {
    request_id: requestId,
    user_id: user.accountId,
    activity_type: "high_intensity_cardio",
    duration_mins: 30,
    avg_hr: 155,
    max_hr: 180,
    min_hr: 90,
    hr_zone_distribution: '{"zone1":5,"zone2":10,"zone3":30,"zone4":40,"zone5":15}',
    recovery_score: 75,
    confidence: 92,
    data_hash: "async_hash_123",
    nova_vault_id: "vault_async",
  });

  // Verify attestation stored
  const attestation = await contract.view("get_attestation", { key });
  const att = JSON.parse(attestation as string);
  t.is(att.user_id, user.accountId);
  t.is(att.confidence, 92);
  t.is(att.request_id, requestId);
  t.is(att.fulfilled_by, oracle.accountId);
});

test.serial("get_pending_requests tracks pending and fulfilled", async (t) => {
  // Request two attestations
  const id1 = await user.call(contract, "request_attestation", {
    data_hash: "pending_test_1",
  });
  const id2 = await user.call(contract, "request_attestation", {
    data_hash: "pending_test_2",
  });

  // Both should be pending
  const pending = (await contract.view("get_pending_requests", {})) as any[];
  const pendingIds = pending.map((r: any) => r.request_id);
  t.true(pendingIds.includes(id1));
  t.true(pendingIds.includes(id2));

  // Fulfill one
  await oracle.call(contract, "fulfill_attestation", {
    request_id: id1,
    user_id: user.accountId,
    activity_type: "cardio",
    duration_mins: 20,
    avg_hr: 130,
    max_hr: 155,
    min_hr: 85,
    hr_zone_distribution: "{}",
    recovery_score: 60,
    confidence: 85,
    data_hash: "pending_test_1",
    nova_vault_id: "",
  });

  // Only id2 should remain pending
  const remaining = (await contract.view("get_pending_requests", {})) as any[];
  const remainingIds = remaining.map((r: any) => r.request_id);
  t.false(remainingIds.includes(id1));
  t.true(remainingIds.includes(id2));
});

test.serial("only oracle can fulfill", async (t) => {
  const requestId = await user.call(contract, "request_attestation", {
    data_hash: "unauthorized_test",
  });

  await t.throwsAsync(
    user.call(contract, "fulfill_attestation", {
      request_id: requestId,
      user_id: user.accountId,
      activity_type: "cardio",
      duration_mins: 10,
      avg_hr: 120,
      max_hr: 140,
      min_hr: 80,
      hr_zone_distribution: "{}",
      recovery_score: 50,
      confidence: 70,
      data_hash: "unauthorized_test",
      nova_vault_id: "",
    })
  );
});
