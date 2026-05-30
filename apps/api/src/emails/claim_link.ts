import type { EmailMessage } from "../lib/resend";
import type { GiftRequest, Env } from "../types";

export function buildClaimLinkEmail(env: Env, row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const orderNum = row.amazon_order_number;
  const claimUrl = `${env.CLAIM_LINK_BASE}?token=${row.unique_token}`;
  const email = row.email ?? "";

  const text = `Hi ${fullName},

Quick favor first — if you're happy with your foot massager (Amazon order ${orderNum}), a short honest review on Amazon means the world to small US companies like ours: https://www.amazon.com/your-orders

Now the good part: your free Renewera Handheld Wood Bath Roller Massage Brush is ready to claim. Open the link below to share your shipping address, and we'll send it out right away:

${claimUrl}

This link is single-use and expires in 14 days.

Questions? Reply to this email or write contact@renewera.co.

— The Renewera team`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your gift link</title></head><body style="margin:0;padding:0;background-color:#fdf8f2;font-family:-apple-system,Helvetica,Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;"><tr><td align="center" style="padding-bottom:24px;font-family:Georgia,serif;font-size:20px;font-weight:500;color:#2d2420;letter-spacing:0.02em;">Renewera<span style="color:#e28a5c;"> &middot;</span></td></tr><tr><td style="padding-bottom:18px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef4d4;border:1px solid #f0c96a;border-radius:14px;"><tr><td align="center" style="padding:22px 24px;"><div style="font-size:18px;letter-spacing:3px;color:#c99a3c;margin-bottom:6px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div><h2 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:600;font-size:18px;color:#2d2420;letter-spacing:-0.01em;">Happy with your foot massager?</h2><p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#5c4f44;">If you love it, please leave a quick review for Amazon order <strong style="color:#2d2420;font-family:'Courier New',monospace;">${orderNum}</strong>. Honest reviews help small US companies like ours grow &mdash; thank you!</p><a href="https://www.amazon.com/your-orders" style="display:inline-block;padding:10px 22px;background-color:#c99a3c;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;font-family:-apple-system,Arial,sans-serif;">Leave a review on Amazon &rarr;</a></td></tr></table></td></tr><tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #e8dfd2;padding:40px 32px;"><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:500;font-size:30px;line-height:1.15;color:#2d2420;letter-spacing:-0.02em;">Hello ${fullName},</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#6b5d52;">Your free <em style="color:#e28a5c;font-style:italic;">Renewera Handheld Wood Bath Roller Massage Brush</em> is ready to claim. Share your shipping address and we'll send it out right away.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;"><tr><td align="center"><a href="${claimUrl}" style="display:inline-block;padding:14px 32px;background-color:#e28a5c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;font-family:-apple-system,Arial,sans-serif;">Claim your gift &rarr;</a></td></tr></table><p style="margin:24px 0 6px;font-size:13px;color:#a0948a;">Or paste this link:</p><p style="margin:0 0 20px;font-size:12px;word-break:break-all;line-height:1.5;"><a href="${claimUrl}" style="color:#e28a5c;text-decoration:none;">${claimUrl}</a></p><p style="margin:0;padding-top:18px;border-top:1px solid #f0e6d6;font-size:13px;color:#a0948a;">This link is single-use and expires in 14 days.</p></td></tr><tr><td align="center" style="padding-top:24px;font-size:12px;color:#a0948a;line-height:1.6;"><p style="margin:0 0 6px;">Questions? Reply to this email or write <a href="mailto:contact@renewera.co" style="color:#6b5d52;text-decoration:none;">contact@renewera.co</a></p><p style="margin:0;">&copy; Renewera &middot; All rights reserved</p></td></tr></table></td></tr></table></body></html>`;

  return {
    to: email,
    subject: "Your Renewera gift link is ready",
    text,
    html,
  };
}
