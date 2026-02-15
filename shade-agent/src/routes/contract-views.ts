import { Hono } from "hono";
import { getAttestation, getOracle, getReadOnlyProvider } from "../near/submitter.js";

const app = new Hono();

// GET /oracles — list authorized oracles
app.get("/oracles", async (c) => {
  try {
    const provider = getReadOnlyProvider();
    const result = await provider.callFunction<string>({
      contractId: process.env.ATTESTATION_CONTRACT_ID!,
      method: "get_oracles",
      args: {},
    });
    const oracles = result ? JSON.parse(result) : [];
    return c.json({ oracles });
  } catch (err: any) {
    return c.json({ oracles: [], error: err.message });
  }
});

// GET /request-status/:id — check pending request status
app.get("/request-status/:id", async (c) => {
  try {
    const requestId = c.req.param("id");
    const provider = getReadOnlyProvider();
    const result = await provider.callFunction<string>({
      contractId: process.env.ATTESTATION_CONTRACT_ID!,
      method: "get_request_status",
      args: { request_id: requestId },
    });
    return c.json(result ? JSON.parse(result) : null);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /attestation/:key — lookup attestation by key
app.get("/attestation/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const attestation = await getAttestation(key);
    if (!attestation) {
      return c.json({ error: "Attestation not found" }, 404);
    }
    return c.json({ attestation });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
