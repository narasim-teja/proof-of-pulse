import {
  parseHealthExport,
  extractWorkoutSession,
} from "./parser/health-export-parser";
import { analyzeWorkout } from "./engine/attestation-engine";
import { submitAttestation, getAttestation } from "./oracle/submitter";
import {
  storeInNovaVault,
  grantAccess,
  revokeAccess,
  getVaultStatus,
} from "./nova/vault";
import type { NovaVaultResult } from "./types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

async function loadXml(body: {
  xml_data?: string;
  file_path?: string;
}): Promise<string> {
  if (body.xml_data) return body.xml_data;
  const path = body.file_path || "data/export.xml";
  return await Bun.file(path).text();
}

const server = Bun.serve({
  port: 3001,
  routes: {
    "/api/analyze": {
      async POST(req) {
        try {
          const body = await req.json();
          const { date } = body;

          if (!date) return corsJson({ error: "date is required" }, 400);

          const xmlContent = await loadXml(body);
          const samples = parseHealthExport(xmlContent);
          const session = extractWorkoutSession(samples, date);

          if (!session) {
            return corsJson(
              { error: "No workout session found for date" },
              400
            );
          }

          const attestation = analyzeWorkout(session);
          return corsJson({
            attestation,
            session_info: {
              start: session.startDate.toISOString(),
              end: session.endDate.toISOString(),
              sample_count: session.samples.length,
              duration_mins: session.durationMins,
            },
          });
        } catch (err: any) {
          return corsJson({ error: err.message }, 500);
        }
      },
    },

    "/api/attest": {
      async POST(req) {
        try {
          const body = await req.json();
          const { date, user_id } = body;

          if (!date || !user_id) {
            return corsJson(
              { error: "date and user_id are required" },
              400
            );
          }

          const xmlContent = await loadXml(body);
          const samples = parseHealthExport(xmlContent);
          const session = extractWorkoutSession(samples, date);

          if (!session) {
            return corsJson(
              { error: "No workout session found" },
              400
            );
          }

          const attestation = analyzeWorkout(session);

          // Store raw HR data in NOVA Privacy Vault
          let novaResult: NovaVaultResult | null = null;
          try {
            novaResult = await storeInNovaVault(user_id, session.samples, date);
          } catch (err: any) {
            console.warn(`[NOVA] Storage failed: ${err.message}`);
          }
          const novaVaultId = novaResult?.groupId ?? `fallback_${Date.now()}`;

          const { txHash, key } = await submitAttestation(
            user_id,
            attestation,
            novaVaultId
          );

          return corsJson({
            attestation,
            near_tx: txHash,
            attestation_key: key,
            nova_vault_id: novaVaultId,
            nova: novaResult
              ? {
                  cid: novaResult.cid,
                  file_hash: novaResult.fileHash,
                  nova_tx: novaResult.transactionId,
                  is_new_vault: novaResult.isNewVault,
                }
              : null,
            explorer_url: `https://testnet.nearblocks.io/txns/${txHash}`,
          });
        } catch (err: any) {
          return corsJson({ error: err.message }, 500);
        }
      },
    },

    "/api/attestation/*": {
      async GET(req) {
        try {
          // Extract key from URL path after /api/attestation/
          const key = decodeURIComponent(
            new URL(req.url).pathname.replace("/api/attestation/", "")
          );

          if (!key) {
            return corsJson({ error: "Attestation key is required" }, 400);
          }

          const attestation = await getAttestation(key);
          if (!attestation) {
            return corsJson({ error: "Attestation not found" }, 404);
          }

          return corsJson({ attestation });
        } catch (err: any) {
          return corsJson({ error: err.message }, 500);
        }
      },
    },

    "/api/vault/grant": {
      async POST(req) {
        try {
          const body = await req.json();
          const { group_id, member_id } = body;
          if (!group_id || !member_id) {
            return corsJson(
              { error: "group_id and member_id are required" },
              400
            );
          }
          const result = await grantAccess(group_id, member_id);
          return corsJson({ grant: result });
        } catch (err: any) {
          return corsJson({ error: err.message }, 500);
        }
      },
    },

    "/api/vault/revoke": {
      async POST(req) {
        try {
          const body = await req.json();
          const { group_id, member_id } = body;
          if (!group_id || !member_id) {
            return corsJson(
              { error: "group_id and member_id are required" },
              400
            );
          }
          const result = await revokeAccess(group_id, member_id);
          return corsJson({ revoke: result });
        } catch (err: any) {
          return corsJson({ error: err.message }, 500);
        }
      },
    },

    "/api/vault/*": {
      async GET(req) {
        try {
          const groupId = decodeURIComponent(
            new URL(req.url).pathname.replace("/api/vault/", "")
          );
          if (!groupId) {
            return corsJson({ error: "Group ID is required" }, 400);
          }
          const status = await getVaultStatus(groupId);
          return corsJson({ vault: status });
        } catch (err: any) {
          return corsJson({ error: err.message }, 500);
        }
      },
    },
  },

  fetch(req) {
    // Handle CORS preflight for all routes
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    return corsJson({ error: "Not found" }, 404);
  },
});

console.log(
  `Proof of Pulse Oracle running on http://localhost:${server.port}`
);
