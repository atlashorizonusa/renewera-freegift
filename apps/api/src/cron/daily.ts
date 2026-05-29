import type { Env, GiftRequest } from "../types";
import { Supabase } from "../lib/supabase";
import { sendEmail } from "../lib/resend";
import { sendTelegram } from "../lib/telegram";
import { buildClaimLinkEmail } from "../emails/claim_link";
import { buildReminder3DayEmail } from "../emails/reminder_3day";
import { buildReminder7DayEmail } from "../emails/reminder_7day";
import { deliverShippingEmail } from "../routes/internal/shipped";

interface Tally {
  reminders3day: number;
  reminders7day: number;
  expired: number;
  claimRetries: number;
  shippingRetries: number;
  failures: number;
}

// Selectable columns common to most queries in this file.
const SELECT_COLS = "*";

export async function runDailyMaintenance(env: Env): Promise<Tally> {
  const db = new Supabase(env);
  const tally: Tally = {
    reminders3day: 0,
    reminders7day: 0,
    expired: 0,
    claimRetries: 0,
    shippingRetries: 0,
    failures: 0,
  };

  await sendReminders(env, db, tally);
  await sweepExpired(env, db, tally);
  await retryFailedClaimEmails(env, db, tally);
  await retryFailedShippingEmails(env, db, tally);

  await sendTelegram(
    env,
    `🧹 *Daily maintenance — ${env.ENVIRONMENT}*\n\n` +
      `• 3-day reminders: ${tally.reminders3day}\n` +
      `• 7-day reminders: ${tally.reminders7day}\n` +
      `• Expired & recycled: ${tally.expired}\n` +
      `• Claim email retries: ${tally.claimRetries}\n` +
      `• Shipping email retries: ${tally.shippingRetries}\n` +
      `• Failures: ${tally.failures}`,
  );

  return tally;
}

// ── 3-day + 7-day reminder emails ────────────────────────────────
async function sendReminders(env: Env, db: Supabase, tally: Tally) {
  // 7-day first so a row that crossed both thresholds today gets the
  // final-reminder treatment, not a duplicate of the 3-day one.
  const due7 = await db.selectMany<GiftRequest>(
    "gift_requests",
    `select=${SELECT_COLS}&status=eq.submitted&reminder_7day_sent_at=is.null&email_sent_at=lt.${sevenDaysAgo()}`,
  );
  for (const row of due7) {
    try {
      await sendEmail(env, buildReminder7DayEmail(env, row));
      await db.update("gift_requests", `id=eq.${row.id}`, {
        reminder_7day_sent_at: new Date().toISOString(),
        // If we never sent the 3-day either (long gap, edge case), backfill it.
        reminder_3day_sent_at: row.reminder_3day_sent_at ?? new Date().toISOString(),
      });
      tally.reminders7day++;
    } catch (err) {
      console.error("reminder 7day failed", err);
      tally.failures++;
    }
  }

  const due3 = await db.selectMany<GiftRequest>(
    "gift_requests",
    `select=${SELECT_COLS}&status=eq.submitted&reminder_3day_sent_at=is.null&email_sent_at=lt.${threeDaysAgo()}`,
  );
  for (const row of due3) {
    try {
      await sendEmail(env, buildReminder3DayEmail(env, row));
      await db.update("gift_requests", `id=eq.${row.id}`, {
        reminder_3day_sent_at: new Date().toISOString(),
      });
      tally.reminders3day++;
    } catch (err) {
      console.error("reminder 3day failed", err);
      tally.failures++;
    }
  }
}

// ── 10-day expire + recycle to 'new' ─────────────────────────────
async function sweepExpired(env: Env, db: Supabase, tally: Tally) {
  try {
    const recycled = await db.recycleExpired();
    tally.expired = recycled.length;
    if (recycled.length > 0) {
      const lines = recycled
        .map((r) => `• \`${r.amazon_order_number}\` (was: ${r.email ?? "—"})`)
        .join("\n");
      await sendTelegram(
        env,
        `♻️ *Recycled ${recycled.length} expired claim(s)*\n\n${lines}\n\n_These orders are claimable again._`,
      );
    }
  } catch (err) {
    console.error("expire sweep failed", err);
    tally.failures++;
  }
}

// ── Retry sweeps for ctx.waitUntil failures ──────────────────────
async function retryFailedClaimEmails(env: Env, db: Supabase, tally: Tally) {
  const rows = await db.selectMany<GiftRequest>(
    "gift_requests",
    `select=${SELECT_COLS}&claim_email_failed=eq.true&status=eq.submitted`,
  );
  for (const row of rows) {
    try {
      await sendEmail(env, buildClaimLinkEmail(env, row));
      await db.update("gift_requests", `id=eq.${row.id}`, {
        email_sent_at: row.email_sent_at ?? new Date().toISOString(),
        claim_email_failed: false,
      });
      tally.claimRetries++;
    } catch (err) {
      console.error("claim retry failed", err);
      tally.failures++;
    }
  }
}

async function retryFailedShippingEmails(env: Env, db: Supabase, tally: Tally) {
  // Catches: webhook never fired AND ctx.waitUntil failures.
  const rows = await db.selectMany<GiftRequest>(
    "gift_requests",
    `select=${SELECT_COLS}&or=(shipping_email_failed.eq.true,and(status.eq.ready_to_ship,tracking_number.not.is.null,shipping_email_sent_at.is.null))`,
  );
  for (const row of rows) {
    try {
      await deliverShippingEmail(env, row);
      tally.shippingRetries++;
    } catch (err) {
      console.error("shipping retry failed", err);
      tally.failures++;
    }
  }
}

// ── Date helpers ─────────────────────────────────────────────────
function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
}
function threeDaysAgo(): string {
  return new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
}
