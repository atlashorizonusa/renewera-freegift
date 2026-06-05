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

  // Minimal div-based HTML — no tables, no colored sections, no buttons.
  // Intentionally close to plain text visually so Gmail routes to Primary.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:32px 16px;background:#ffffff;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#222222;max-width:520px;margin-left:auto;margin-right:auto;">

  <div style="margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid #dddddd;">
    <span style="font-family:-apple-system,Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#888888;text-transform:uppercase;">Renewera</span>
  </div>

  <p style="margin:0 0 20px;">Hi ${firstName},</p>

  <p style="margin:0 0 20px;">We noticed you recently purchased the Renewera foot massager (order&nbsp;<span style="font-family:'Courier New',monospace;font-size:14px;color:#555555;">${orderNum}</span>). If you're enjoying it, a quick honest review on Amazon would mean the world to us — it helps small US companies like ours grow.</p>

  <p style="margin:0 0 28px;"><a href="https://www.amazon.com/your-orders" style="color:#222222;font-weight:bold;text-decoration:underline;">Leave a review on Amazon &rarr;</a></p>

  <div style="margin-bottom:28px;padding:0;border-top:1px solid #eeeeee;"></div>

  <p style="margin:0 0 20px;">As a thank-you for being a customer, we'd like to send you a complimentary <strong>Renewera Handheld Wood Bath Roller Massage Brush</strong>. Click the link below to enter your shipping address — we'll send it out right away.</p>

  <p style="margin:0 0 8px;"><a href="${claimUrl}" style="color:#222222;font-weight:bold;text-decoration:underline;">Enter your shipping address &rarr;</a></p>

  <p style="margin:0 0 28px;font-family:-apple-system,Arial,sans-serif;font-size:12px;color:#aaaaaa;word-break:break-all;">${claimUrl}</p>

  <div style="margin-bottom:24px;padding:0;border-top:1px solid #eeeeee;"></div>

  <p style="margin:0 0 4px;font-family:-apple-system,Arial,sans-serif;font-size:13px;color:#aaaaaa;">This link is single-use and expires in 14 days.</p>
  <p style="margin:0;font-family:-apple-system,Arial,sans-serif;font-size:13px;color:#aaaaaa;">Questions? Reply to this email or write <a href="mailto:contact@renewera.co" style="color:#aaaaaa;">contact@renewera.co</a></p>

</body>
</html>`;

  return {
    to: email,
    subject: `Following up on your order ${orderNum}`,
    text,
    html,
  };
}
