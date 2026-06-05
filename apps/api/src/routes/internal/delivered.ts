import { Hono } from "hono";
import type { Env, GiftRequest } from "../../types";
import { Supabase } from "../../lib/supabase";
import { sendEmail } from "../../lib/resend";
import { sendTelegram } from "../../lib/telegram";
import { buildDeliveredEmail } from "../../emails/delivered";
import { timingSafeEqual } from "../../lib/hmac";

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: GiftRequest;
  old_record?: Partial<GiftRequest>;
}

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  const env = c.env;

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

  const hint = payload.record;
  if (!hint?.id) return c.json({ error: "no record" }, 400);

  // Guard using minimal hint fields sent by the trigger.
  const oldDeliveredAt = payload.old_record?.delivered_at ?? null;
  if (
    !hint.delivered_at ||
    hint.status !== "shipped" ||
    hint.delivery_email_sent_at ||
    oldDeliveredAt === hint.delivered_at
  ) {
    return c.json({ skipped: true });
  }

  // Fetch full row so email has all fields (name, address, etc.).
  const db = new Supabase(env);
  const row = await db.selectOne<GiftRequest>("gift_requests", `id=eq.${hint.id}`);
  if (!row) return c.json({ skipped: true });

  await deliverDeliveryEmail(env, row);
  return c.json({ ok: true });
});

export async function deliverDeliveryEmail(env: Env, row: GiftRequest) {
  const db = new Supabase(env);

  try {
    await sendEmail(env, buildDeliveredEmail(row));
    await db.update("gift_requests", `id=eq.${row.id}`, {
      status: "delivered",
      delivery_email_sent_at: new Date().toISOString(),
      delivery_email_failed: false,
    });
  } catch (err) {
    console.error("delivery email failed", err);
    await db.update("gift_requests", `id=eq.${row.id}`, {
      delivery_email_failed: true,
    });
    await sendTelegram(
      env,
      `⚠️ *Delivery email FAILED*\n\nEmail: \`${row.email}\`\nOrder: \`${row.amazon_order_number}\`\n\nRow flagged for retry by daily cron.`,
    );
  }
}

export default app;
