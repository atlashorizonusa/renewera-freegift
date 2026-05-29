import type { EmailMessage } from "../lib/resend";
import type { GiftRequest, Env } from "../types";

// Soft nudge 3 days after the claim link was sent.
export function buildReminder3DayEmail(env: Env, row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const orderNum = row.amazon_order_number;
  const claimUrl = `${env.CLAIM_LINK_BASE}?token=${row.unique_token}`;
  const email = row.email ?? "";

  const text = `Hi ${fullName},

Just a quick reminder — your free Renewera ankle wrap is still waiting for you. Your claim link is good for a few more days, but if you don't share your shipping address soon it will expire.

Claim your gift here:
${claimUrl}

Order: ${orderNum}

Questions? Reply to this email or write contact@renewera.co.

— The Renewera team`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reminder: claim your gift</title></head><body style="margin:0;padding:0;background-color:#fdf8f2;font-family:-apple-system,Helvetica,Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;"><tr><td align="center" style="padding-bottom:24px;font-family:Georgia,serif;font-size:20px;font-weight:500;color:#2d2420;letter-spacing:0.02em;">Renewera<span style="color:#e28a5c;"> &middot;</span></td></tr><tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #e8dfd2;padding:40px 32px;"><div style="display:inline-block;padding:6px 14px;background-color:#fae5d3;color:#e28a5c;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:999px;margin-bottom:16px;">Reminder</div><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:500;font-size:28px;line-height:1.2;color:#2d2420;letter-spacing:-0.02em;">Hi ${fullName}, your gift is still waiting.</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#6b5d52;">Your free <em style="color:#e28a5c;font-style:italic;">ankle wrap</em> is reserved for you. Share your shipping address and we'll send it right out.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;"><tr><td align="center"><a href="${claimUrl}" style="display:inline-block;padding:14px 32px;background-color:#e28a5c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;font-family:-apple-system,Arial,sans-serif;">Claim your gift &rarr;</a></td></tr></table><p style="margin:24px 0 6px;font-size:13px;color:#a0948a;">Or paste this link:</p><p style="margin:0 0 20px;font-size:12px;word-break:break-all;line-height:1.5;"><a href="${claimUrl}" style="color:#e28a5c;text-decoration:none;">${claimUrl}</a></p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;border:1px solid #e8dfd2;border-radius:12px;margin:24px 0 0;"><tr><td style="padding:14px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#a0948a;padding:4px 0;">Order</td><td align="right" style="font-family:'Courier New',monospace;font-size:13px;color:#2d2420;font-weight:600;padding:4px 0;">${orderNum}</td></tr></table></td></tr></table></td></tr><tr><td align="center" style="padding-top:24px;font-size:12px;color:#a0948a;line-height:1.6;"><p style="margin:0 0 6px;">Questions? Reply to this email or write <a href="mailto:contact@renewera.co" style="color:#6b5d52;text-decoration:none;">contact@renewera.co</a></p><p style="margin:0;">&copy; Renewera &middot; All rights reserved</p></td></tr></table></td></tr></table></body></html>`;

  return {
    to: email,
    subject: "Reminder: your Renewera gift is still waiting",
    text,
    html,
  };
}
