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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>A note from Renewera</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <span style="font-size:18px;font-weight:600;color:#2d2420;letter-spacing:0.04em;">RENEWERA</span>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:10px;border:1px solid #e5e5e5;padding:36px 36px 32px;">

              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#222222;">Hi ${firstName},</p>

              <!-- Review ask — plain section, no colorful box -->
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">We noticed you recently purchased the Renewera foot massager (order <span style="font-family:'Courier New',monospace;font-size:13px;color:#555555;">${orderNum}</span>). If you're enjoying it, a quick honest review on Amazon would mean a lot to us — it helps small US companies like ours grow.</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333333;padding-bottom:24px;border-bottom:1px solid #eeeeee;"><a href="https://www.amazon.com/your-orders" style="color:#2d2420;font-weight:600;text-decoration:underline;">Leave a review on Amazon &rarr;</a></p>

              <!-- Gift section -->
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">As a thank-you for being a customer, we'd like to send you a complimentary <strong>Renewera Handheld Wood Bath Roller Massage Brush</strong>. Enter your shipping address below and we'll send it out right away.</p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td>
                    <a href="${claimUrl}" style="display:inline-block;padding:13px 28px;background-color:#2d2420;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;border-radius:6px;">Enter your shipping address &rarr;</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;color:#999999;">Or copy this link:</p>
              <p style="margin:0 0 24px;font-size:12px;word-break:break-all;line-height:1.5;"><a href="${claimUrl}" style="color:#555555;text-decoration:underline;">${claimUrl}</a></p>
              <p style="margin:0;padding-top:20px;border-top:1px solid #eeeeee;font-size:13px;color:#999999;">This link is single-use and expires in 14 days. Questions? Reply to this email or write <a href="mailto:contact@renewera.co" style="color:#777777;text-decoration:none;">contact@renewera.co</a></p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;font-size:12px;color:#aaaaaa;">
              &copy; Renewera &middot; All rights reserved
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    to: email,
    subject: `Following up on your order ${orderNum}`,
    text,
  };
}
