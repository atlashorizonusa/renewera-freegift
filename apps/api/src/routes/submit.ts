import { Hono } from "hono";
import type { Env, GiftRequest, SubmitPayload } from "../types";
import { Supabase } from "../lib/supabase";
import { verifyTurnstile } from "../lib/turnstile";
import { sendEmail } from "../lib/resend";
import { sendTelegram } from "../lib/telegram";
import { buildClaimLinkEmail } from "../emails/claim_link";
import { ORDER_RE, EMAIL_RE, isDisposableEmail, clientIp } from "../lib/validate";

type Vars = Record<string, never>;

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.post("/", async (c) => {
  const env = c.env;
  let body: SubmitPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const orderNum = (body.amazonOrderNumber ?? "").trim();
  const turnstileToken = body.turnstileToken ?? "";
  const ip = clientIp(c.req.raw);
  const userAgent = c.req.header("user-agent") ?? "";

  // Format checks (Box 1)
  if (!fullName || !email || !orderNum) {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }
  if (!ORDER_RE.test(orderNum)) {
    return c.json({ success: false, error: "INVALID_ORDER_FORMAT" }, 400);
  }
  if (isDisposableEmail(email)) {
    return c.json({ success: false, error: "DISPOSABLE_EMAIL" }, 400);
  }

  // Turnstile (Box 1)
  if (!turnstileToken) {
    return c.json({ success: false, error: "INVALID_TURNSTILE" }, 400);
  }
  const turnstileOk = await verifyTurnstile(env, turnstileToken, ip);
  if (!turnstileOk) {
    return c.json({ success: false, error: "INVALID_TURNSTILE" }, 400);
  }

  const db = new Supabase(env);

  // Rate limits (Box 1)
  const [emailLimited, ipCount] = await Promise.all([
    db.emailRateLimited(email),
    db.ipSubmissionCount(ip),
  ]);
  if (emailLimited) {
    return c.json({ success: false, error: "RATE_LIMITED_EMAIL" }, 429);
  }
  if (ipCount >= 3) {
    return c.json({ success: false, error: "RATE_LIMITED_IP" }, 429);
  }

  // Order lookup (Box 2)
  const status = (await db.orderStatus(orderNum))[0];
  if (!status?.exists_in_db) {
    return c.json({ success: false, error: "ORDER_NOT_FOUND" }, 400);
  }
  if (!status.available) {
    return c.json(
      { success: false, error: "ORDER_ALREADY_CLAIMED", currentStatus: status.current_status },
      400,
    );
  }

  // Flip to 'submitted' (Box 2)
  const updated = await db.update<GiftRequest>(
    "gift_requests",
    `amazon_order_number=eq.${encodeURIComponent(orderNum)}&status=eq.new`,
    {
      full_name: fullName,
      email,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: userAgent,
    },
  );
  if (updated.length === 0) {
    // Race: another request just claimed it.
    return c.json({ success: false, error: "ORDER_ALREADY_CLAIMED" }, 400);
  }
  const row = updated[0]!;

  // Respond immediately; finish email send in background.
  c.executionCtx.waitUntil(deliverClaimEmail(env, db, row));

  return c.json({
    success: true,
    message: "Thank you. We will shortly send you your free gift link via email.",
  });
});

async function deliverClaimEmail(env: Env, db: Supabase, row: GiftRequest) {
  try {
    const msg = buildClaimLinkEmail(env, row);
    await sendEmail(env, msg);
    await db.update(
      "gift_requests",
      `id=eq.${row.id}`,
      { email_sent_at: new Date().toISOString(), claim_email_failed: false },
    );
  } catch (err) {
    console.error("claim email failed", err);
    try {
      await db.update(
        "gift_requests",
        `id=eq.${row.id}`,
        { claim_email_failed: true },
      );
    } catch (innerErr) {
      console.error("could not mark claim_email_failed", innerErr);
    }
    await sendTelegram(
      env,
      `⚠️ *Claim email FAILED*\n\nEmail: \`${row.email}\`\nOrder: \`${row.amazon_order_number}\`\n\nRow flagged for retry by daily cron.`,
    );
  }
}

export default app;
