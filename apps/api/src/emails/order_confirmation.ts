import type { EmailMessage } from "../lib/resend";
import type { GiftRequest } from "../types";

export function buildOrderConfirmationEmail(row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const orderNum = row.amazon_order_number;
  const city = row.shipping_city ?? "";
  const state = row.shipping_state ?? "";
  const email = row.email ?? "";

  const text = `Thank you, ${fullName}!

Your free gift is confirmed and being prepared for shipment to ${city}, ${state}.

Order: ${orderNum}
Status: Processing

We'll email you tracking the moment it ships — usually within 2–3 business days.

Need to change your address? Reply to this email or write contact@renewera.co as soon as possible.

— The Renewera team`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order confirmed</title></head><body style="margin:0;padding:0;background-color:#fdf8f2;font-family:-apple-system,Helvetica,Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;"><tr><td align="center" style="padding-bottom:24px;font-family:Georgia,serif;font-size:20px;font-weight:500;color:#2d2420;letter-spacing:0.02em;">Renewera<span style="color:#e28a5c;"> &middot;</span></td></tr><tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #e8dfd2;padding:40px 32px;"><div style="display:inline-block;padding:6px 14px;background-color:#e1ebdb;color:#7a9471;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:999px;margin-bottom:16px;">&#10003; Order confirmed</div><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:500;font-size:30px;line-height:1.15;color:#2d2420;letter-spacing:-0.02em;">Thank you, ${fullName}.</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#6b5d52;">Your free gift is being prepared for shipment to <strong style="color:#2d2420;">${city}, ${state}</strong>. We'll send tracking the moment it ships &mdash; usually within 2&ndash;3 business days.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;border:1px solid #e8dfd2;border-radius:12px;margin:24px 0;"><tr><td style="padding:16px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#a0948a;padding:4px 0;">Order</td><td align="right" style="font-family:'Courier New',monospace;font-size:13px;color:#2d2420;font-weight:600;padding:4px 0;">${orderNum}</td></tr><tr><td style="font-size:13px;color:#a0948a;padding:4px 0;">Status</td><td align="right" style="font-size:13px;color:#7a9471;font-weight:600;padding:4px 0;">Processing</td></tr></table></td></tr></table><p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #f0e6d6;font-size:13px;color:#a0948a;line-height:1.55;">Need to change your address? Reply to this email as soon as possible.</p></td></tr><tr><td align="center" style="padding-top:24px;font-size:12px;color:#a0948a;line-height:1.6;"><p style="margin:0 0 6px;">Questions? Write <a href="mailto:contact@renewera.co" style="color:#6b5d52;text-decoration:none;">contact@renewera.co</a></p><p style="margin:0;">&copy; Renewera &middot; All rights reserved</p></td></tr></table></td></tr></table></body></html>`;

  return {
    to: email,
    subject: "Order confirmed — your Renewera gift is being prepared",
    text,
    html,
  };
}
