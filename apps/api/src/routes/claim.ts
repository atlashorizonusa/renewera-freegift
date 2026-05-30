import { Hono } from "hono";
import type { Env, ClaimPayload, GiftRequest } from "../types";
import { Supabase } from "../lib/supabase";
import { sendEmail } from "../lib/resend";
import { sendTelegram } from "../lib/telegram";
import { buildOrderConfirmationEmail } from "../emails/order_confirmation";
import { ZIP_RE } from "../lib/validate";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  const env = c.env;
  let body: ClaimPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }

  const token = (body.token ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const line1 = (body.line1 ?? "").trim();
  const line2 = (body.line2 ?? "").trim();
  const city = (body.city ?? "").trim();
  const state = (body.state ?? "").trim();
  const zip = (body.zip ?? "").trim();
  const country = (body.country ?? "US").trim();

  if (!token || !phone || !line1 || !city || !state || !zip) {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }
  if (!ZIP_RE.test(zip)) {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }

  const db = new Supabase(env);

  // Box 4b: look up by token
  const row = await db.selectOne<GiftRequest>(
    "gift_requests",
    `select=*&unique_token=eq.${encodeURIComponent(token)}`,
  );
  if (!row) {
    return c.json({ success: false, error: "INVALID_TOKEN" }, 400);
  }
  if (row.status !== "submitted") {
    return c.json(
      { success: false, error: "ALREADY_CLAIMED", currentStatus: row.status },
      400,
    );
  }

  // Save shipping + flip status
  const updated = await db.update<GiftRequest>(
    "gift_requests",
    `id=eq.${row.id}&status=eq.submitted`,
    {
      status: "ready_to_ship",
      claimed_at: new Date().toISOString(),
      phone,
      shipping_line1: line1,
      shipping_line2: line2 || null,
      shipping_city: city,
      shipping_state: state,
      shipping_zip: zip,
      shipping_country: country,
    },
  );
  if (updated.length === 0) {
    return c.json({ success: false, error: "ALREADY_CLAIMED" }, 400);
  }
  const after = updated[0]!;

  // Respond first; do follow-up work after.
  c.executionCtx.waitUntil(postClaimWork(env, db, after));

  return c.json({
    success: true,
    message: "Order confirmed. We'll email tracking info when it ships.",
  });
});

async function postClaimWork(env: Env, db: Supabase, row: GiftRequest) {
  // Order confirmation email
  try {
    await sendEmail(env, buildOrderConfirmationEmail(row));
  } catch (err) {
    console.error("order confirmation email failed", err);
    await sendTelegram(
      env,
      `⚠️ *Order confirmation email FAILED*\n\nEmail: \`${row.email}\`\nOrder: \`${row.amazon_order_number}\``,
    );
  }

  // Telegram notify (count active claims first)
  let claimsTotal = 0;
  try {
    const rows = await db.selectMany<{ count: number }>(
      "gift_requests",
      "select=id&status=in.(ready_to_ship,shipped)",
    );
    claimsTotal = rows.length;
  } catch (err) {
    console.error("count active claims failed", err);
  }
  await sendTelegram(
    env,
    `🎁 *New Free Gift Claim*\n\n👤 ${row.full_name}\n📍 ${row.shipping_city}, ${row.shipping_state}\n📧 ${row.email}\n🛒 Order: \`${row.amazon_order_number}\`\n\n📊 Total claims: *${claimsTotal}*\n\n_Add tracking # in Supabase to trigger shipping email._`,
  );
}

export default app;
