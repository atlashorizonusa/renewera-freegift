import { Hono } from "hono";
import type { Env, VerifyPayload } from "../types";
import { Supabase } from "../lib/supabase";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  let body: VerifyPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ state: "invalid" });
  }
  const token = (body.token ?? "").trim();
  if (!token) return c.json({ state: "not_found" });

  const db = new Supabase(c.env);
  const row = await db.selectOne(
    "gift_requests",
    `select=id,status,full_name,email,amazon_order_number,claimed_at&unique_token=eq.${encodeURIComponent(token)}`,
  );

  if (!row) return c.json({ state: "not_found" });

  if (row.status === "ready_to_ship" || row.status === "shipped") {
    return c.json({ state: "already_claimed" });
  }
  if (row.status !== "submitted") {
    return c.json({ state: "invalid", currentStatus: row.status });
  }

  return c.json({
    state: "valid",
    fullName: row.full_name,
    email: row.email,
    amazonOrderNumber: row.amazon_order_number,
  });
});

export default app;
