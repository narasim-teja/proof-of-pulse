import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";

// Load environment variables from .env file (only needed for local development)
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.development.local" });
}

// Import routes
import agentAccount from "./routes/agentAccount.js";
import agentInfo from "./routes/agentInfo.js";
import analyze from "./routes/analyze.js";
import attest from "./routes/attest.js";
import pendingRequests from "./routes/pendingRequests.js";

const app = new Hono();

// Configure CORS
app.use(cors());

// Health check
app.get("/", (c) =>
  c.json({ message: "Proof of Pulse Shade Agent is running" })
);

// Routes
app.route("/api/agent-account", agentAccount);
app.route("/api/agent-info", agentInfo);
app.route("/api/analyze", analyze);
app.route("/api/attest", attest);
app.route("/api/pending-requests", pendingRequests);

// Start the server
const port = Number(process.env.PORT || "3000");

console.log(`Proof of Pulse Shade Agent running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
