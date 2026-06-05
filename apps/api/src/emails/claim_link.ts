import type { EmailMessage } from "../lib/resend";
import type { GiftRequest, Env } from "../types";

export function buildClaimLinkEmail(env: Env, row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const firstName = fullName.split(" ")[0] || fullName;
  const orderNum = row.amazon_order_number;
  const claimUrl = `${env.CLAIM_LINK_BASE}?token=${row.unique_token}`;
  const email = row.email ?? "";

  const text = `Hi ${firstName},

We noticed you recently purchased the Renewera foot massager (Amazon order ${orderNum}). If you're enjoying it, we'd really appreciate a quick honest review — it means a lot to small US companies like ours:
https://www.amazon.com/your-orders

As a thank-you for being a customer, we'd like to send you a complimentary Renewera Handheld Wood Bath Roller Massage Brush. Open the link below to enter your shipping address and we'll send it out right away:

${claimUrl}

This link is single-use and expires in 14 days.

Questions? Reply to this email or write contact@renewera.co.

— The Renewera team`;

  // Intentionally minimal — just <p> tags, no containers, no layout.
  // Renders like a personal Gmail compose email. Keeps Primary routing.
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;margin:0;padding:0;">

<p style="margin:0 0 18px;">Hi ${firstName},</p>

<p style="margin:0 0 18px;color:#444444;">We noticed you recently purchased the Renewera foot massager (order&nbsp;<code style="font-size:13px;background:#f4f4f4;padding:2px 6px;border-radius:3px;color:#555;">${orderNum}</code>). If you're enjoying it, a quick honest review on Amazon would mean a lot to us — it helps small US companies like ours grow.</p>

<p style="margin:0 0 24px;"><a href="https://www.amazon.com/your-orders" style="color:#1a1a1a;font-weight:600;text-decoration:underline;">Leave a review on Amazon &rarr;</a></p>

<p style="margin:0 0 18px;color:#444444;">As a thank-you for being a customer, we'd like to send you a complimentary <strong style="color:#1a1a1a;">Renewera Handheld Wood Bath Roller Massage Brush</strong>. Enter your shipping address below and we'll send it right away.</p>

<p style="margin:0 0 8px;"><a href="${claimUrl}" style="color:#1a1a1a;font-weight:600;text-decoration:underline;">Enter your shipping address &rarr;</a></p>

<p style="margin:0 0 24px;font-size:12px;color:#aaaaaa;word-break:break-all;">${claimUrl}</p>

<p style="margin:0 0 6px;font-size:13px;color:#aaaaaa;">This link is single-use and expires in 14 days.</p>
<p style="margin:0 0 24px;font-size:13px;color:#aaaaaa;">Questions? Reply to this email or write <a href="mailto:contact@renewera.co" style="color:#aaaaaa;">contact@renewera.co</a></p>

<p style="margin:0;font-size:13px;color:#aaaaaa;">— The Renewera team</p>

</body>
</html>`;

  return {
    to: email,
    subject: `Following up on your order ${orderNum}`,
    text,
    html,
  };
}
