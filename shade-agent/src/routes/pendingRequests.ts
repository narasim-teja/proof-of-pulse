import { Hono } from "hono";
import { getPendingRequests } from "../near/submitter";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const pending = await getPendingRequests();
    return c.json({ pending });
  } catch (err: any) {
    return c.json({ pending: [], error: err.message });
  }
});

export default app;
