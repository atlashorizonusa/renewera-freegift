import { Hono } from "hono";
import type { Env, GiftRequest } from "../../types";
import { Supabase } from "../../lib/supabase";
import { sendEmail } from "../../lib/resend";
import { sendTelegram } from "../../lib/telegram";
import { detectCarrier } from "../../lib/carrier";
import { buildShippedEmail } from "../../emails/shipped";
import { timingSafeEqual } from "../../lib/hmac";

// Supabase Database Webhook payload (simplified — we only use the
// fields we need).
interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: GiftRequest;
  old_record?: Partial<GiftRequest>;
}

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  const env = c.env;

  // Auth: shared secret in header (set by Supabase webhook config).
  const provided = c.req.header("x-webhook-secret") ?? "";
  if (!timingSafeEqual(provided, env.SUPABASE_WEBHOOK_SECRET)) {
    return c.json({ error: "unauthorized" }, 401);
  }

  let payload: SupabaseWebhookPayload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "bad payload" }, 400);
  }

  const row = payload.record;
  if (!row?.id) return c.json({ error: "no record" }, 400);

  // Guard: only act if tracking was just added on a ready_to_ship row.
  const oldTracking = payload.old_record?.tracking_number ?? null;
  if (
    !row.tracking_number ||
    row.status !== "ready_to_ship" ||
    row.shipping_email_sent_at ||
    oldTracking === row.tracking_number
  ) {
    return c.json({ skipped: true });
  }

  await deliverShippingEmail(env, row);
  return c.json({ ok: true });
});

export async function deliverShippingEmail(env: Env, row: GiftRequest) {
  const db = new Supabase(env);
  const tracking = (row.tracking_number ?? "").trim();
  if (!tracking) return;

  const detected = detectCarrier(tracking);
  // Honor any manually-set carrier/url on the row, otherwise auto-detect.
  const carrier = (row.carrier && row.carrier.trim()) || detected.carrier;
  const trackingUrl = (row.tracking_url && row.tracking_url.trim()) || detected.tracking_url;

  try {
    await sendEmail(env, buildShippedEmail(row, trackingUrl, carrier));
    await db.update("gift_requests", `id=eq.${row.id}`, {
      status: "shipped",
      shipped_at: new Date().toISOString(),
      shipping_email_sent_at: new Date().toISOString(),
      tracking_url: trackingUrl,
      carrier,
      shipping_email_failed: false,
    });
  } catch (err) {
    console.error("shipping email failed", err);
    await db.update("gift_requests", `id=eq.${row.id}`, {
      shipping_email_failed: true,
    });
    await sendTelegram(
      env,
      `⚠️ *Shipping email FAILED*\n\nEmail: \`${row.email}\`\nTracking: \`${tracking}\`\n\nRow flagged for retry by daily cron.`,
    );
  }
}

export default app;
