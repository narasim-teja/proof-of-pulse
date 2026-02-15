import { Hono } from "hono";
import {
  grantAccess,
  revokeAccess,
  getVaultStatus,
} from "../nova/vault.js";

const app = new Hono();

// POST /grant — grant vault access to a member
app.post("/grant", async (c) => {
  try {
    const body = await c.req.json();
    const { group_id, member_id } = body;
    if (!group_id || !member_id) {
      return c.json({ error: "group_id and member_id are required" }, 400);
    }
    const result = await grantAccess(group_id, member_id);
    return c.json({ grant: result });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /revoke — revoke vault access from a member
app.post("/revoke", async (c) => {
  try {
    const body = await c.req.json();
    const { group_id, member_id } = body;
    if (!group_id || !member_id) {
      return c.json({ error: "group_id and member_id are required" }, 400);
    }
    const result = await revokeAccess(group_id, member_id);
    return c.json({ revoke: result });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /:groupId — get vault status
app.get("/:groupId", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    if (!groupId) {
      return c.json({ error: "Group ID is required" }, 400);
    }
    const status = await getVaultStatus(groupId);
    return c.json({ vault: status });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
