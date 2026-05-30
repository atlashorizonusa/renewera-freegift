import type { EmailMessage } from "../lib/resend";
import type { GiftRequest } from "../types";

export function buildDeliveredEmail(row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const orderNum = row.amazon_order_number;
  const email = row.email ?? "";

  const text = `Great news, ${fullName} — your gift has arrived!

Your Renewera Handheld Wood Bath Roller Massage Brush should be with you now. We hope you love it.

If you're enjoying your foot massager and the roller, an honest Amazon review means the world to a small US brand like ours — it helps other customers find us:
https://www.amazon.com/your-orders

Order: ${orderNum}

Questions or anything wrong with your delivery? Reply to this email or write contact@renewera.co — we'll make it right.

Thank you for choosing Renewera.

— The Renewera team`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your gift has arrived</title></head><body style="margin:0;padding:0;background-color:#fdf8f2;font-family:-apple-system,Helvetica,Arial,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fdf8f2;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;"><tr><td align="center" style="padding-bottom:28px;font-family:Georgia,serif;font-size:20px;font-weight:500;color:#2d2420;letter-spacing:0.02em;">Renewera<span style="color:#e28a5c;"> &middot;</span></td></tr><tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #e8dfd2;padding:40px 32px;"><div style="display:inline-block;padding:6px 14px;background-color:#e1ebdb;color:#7a9471;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:999px;margin-bottom:16px;">Delivered</div><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:500;font-size:30px;line-height:1.15;color:#2d2420;letter-spacing:-0.02em;">Your gift has <em style="color:#7a9471;font-style:italic;">arrived</em>, ${fullName}!</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#6b5d52;">Your <strong style="color:#2d2420;">Renewera Handheld Wood Bath Roller Massage Brush</strong> should be with you now. We hope it brings you some well-deserved relaxation.</p></td></tr><tr><td style="padding-top:14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#faf1de;border:1px solid #e8dfd2;border-radius:16px;"><tr><td align="center" style="padding:32px 28px;"><div style="font-size:22px;letter-spacing:4px;color:#c99a3c;margin-bottom:10px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:500;font-size:22px;color:#2d2420;letter-spacing:-0.01em;">Enjoying your Renewera products?</h2><p style="margin:0 auto 20px;font-size:14px;line-height:1.6;color:#6b5d52;max-width:380px;">An honest Amazon review for order <strong style="color:#2d2420;font-family:'Courier New',monospace;">${orderNum}</strong> helps other customers find us and helps our small team grow. It takes under a minute &mdash; and it means everything to us.</p><a href="https://www.amazon.com/your-orders" style="display:inline-block;padding:12px 26px;background-color:#c99a3c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;font-family:-apple-system,Arial,sans-serif;">Leave a review on Amazon &rarr;</a></td></tr></table></td></tr><tr><td align="center" style="padding-top:24px;font-size:12px;color:#a0948a;line-height:1.6;"><p style="margin:0 0 6px;">Something wrong with your delivery? Reply here or write <a href="mailto:contact@renewera.co" style="color:#6b5d52;text-decoration:none;">contact@renewera.co</a></p><p style="margin:0;">&copy; Renewera &middot; All rights reserved</p></td></tr></table></td></tr></table></body></html>`;

  return {
    to: email,
    subject: "Your Renewera gift has arrived 🎉",
    text,
    html,
  };
}
