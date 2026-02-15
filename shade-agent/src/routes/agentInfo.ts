import { Hono } from "hono";

const app = new Hono();

app.get("/", async (c) => {
  return c.json({
    name: "Proof of Pulse Oracle",
    version: "1.0.0",
    description: "Biometric attestation oracle running in TEE",
    capabilities: [
      "heart_rate_analysis",
      "workout_verification",
      "attestation_signing",
    ],
    contract: process.env.ATTESTATION_CONTRACT_ID,
    runtime: "shade-agent-tee",
  });
});

export default app;
