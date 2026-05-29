import type { EmailMessage } from "../lib/resend";
import type { GiftRequest } from "../types";

export function buildShippedEmail(
  row: GiftRequest,
  trackingUrl: string,
  carrier: string,
): EmailMessage {
  const fullName = row.full_name ?? "";
  const trackingNumber = row.tracking_number ?? "";
  const city = row.shipping_city ?? "";
  const state = row.shipping_state ?? "";
  const zip = row.shipping_zip ?? "";
  const email = row.email ?? "";

  const text = `It's on the way, ${fullName}!

Your Renewera ankle wrap has shipped via ${carrier}.

Track your shipment: ${trackingUrl}

Tracking: ${trackingNumber}
Carrier: ${carrier}
Shipping to: ${city}, ${state} ${zip}

Once it arrives and you've tried it out, an honest Amazon review helps us enormously — and helps other customers find us. Leave a review: https://www.amazon.com/your-orders

— The Renewera team`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your gift has shipped</title></head><body style="margin:0;padding:0;background-color:#fdf8f2;font-family:-apple-system,Helvetica,Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;"><tr><td align="center" style="padding-bottom:28px;font-family:Georgia,serif;font-size:20px;font-weight:500;color:#2d2420;letter-spacing:0.02em;">Renewera<span style="color:#e28a5c;"> &middot;</span></td></tr><tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #e8dfd2;padding:40px 32px;"><div style="display:inline-block;padding:6px 14px;background-color:#fae5d3;color:#e28a5c;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:999px;margin-bottom:16px;">On the way</div><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:500;font-size:30px;line-height:1.15;color:#2d2420;letter-spacing:-0.02em;">It's on the <em style="color:#e28a5c;font-style:italic;">way</em>, ${fullName}.</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#6b5d52;">Your Renewera ankle wrap has shipped via <strong style="color:#2d2420;">${carrier}</strong>.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;"><tr><td align="center"><a href="${trackingUrl}" style="display:inline-block;padding:14px 32px;background-color:#e28a5c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;font-family:-apple-system,Arial,sans-serif;">Track your shipment &rarr;</a></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;border:1px solid #e8dfd2;border-radius:12px;margin:24px 0;"><tr><td style="padding:16px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#a0948a;padding:4px 0;">Tracking</td><td align="right" style="font-family:'Courier New',monospace;font-size:13px;color:#2d2420;font-weight:600;padding:4px 0;">${trackingNumber}</td></tr><tr><td style="font-size:13px;color:#a0948a;padding:4px 0;">Carrier</td><td align="right" style="font-size:13px;color:#2d2420;font-weight:600;padding:4px 0;">${carrier}</td></tr><tr><td style="font-size:13px;color:#a0948a;padding:4px 0;">Shipping to</td><td align="right" style="font-size:13px;color:#2d2420;font-weight:500;padding:4px 0;">${city}, ${state}</td></tr></table></td></tr></table></td></tr><tr><td style="padding-top:14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#faf1de;border:1px solid #e8dfd2;border-radius:16px;"><tr><td align="center" style="padding:32px 28px;"><div style="font-size:22px;letter-spacing:4px;color:#c99a3c;margin-bottom:10px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:500;font-size:22px;color:#2d2420;letter-spacing:-0.01em;">Loving your foot massager?</h2><p style="margin:0 auto 20px;font-size:14px;line-height:1.6;color:#6b5d52;max-width:380px;">Once your gift arrives and you've had a chance to try it, a quick honest review on Amazon helps us enormously &mdash; and helps other customers discover us.</p><a href="https://www.amazon.com/your-orders" style="display:inline-block;padding:12px 26px;background-color:#ffffff;color:#e28a5c;font-size:14px;font-weight:600;text-decoration:none;border:1.5px solid #e28a5c;border-radius:10px;font-family:-apple-system,Arial,sans-serif;">Leave a review &rarr;</a></td></tr></table></td></tr><tr><td align="center" style="padding-top:24px;font-size:12px;color:#a0948a;line-height:1.6;"><p style="margin:0 0 6px;">Questions? Write <a href="mailto:contact@renewera.co" style="color:#6b5d52;text-decoration:none;">contact@renewera.co</a></p><p style="margin:0;">&copy; Renewera &middot; All rights reserved</p></td></tr></table></td></tr></table></body></html>`;

  return {
    to: email,
    subject: "Your Renewera gift has shipped",
    text,
    html,
  };
}
