import type { EmailMessage } from "../lib/resend";
import type { GiftRequest, Env } from "../types";

export function buildClaimLinkEmail(env: Env, row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const firstName = fullName.split(" ")[0] || fullName;
  const orderNum = row.amazon_order_number;
  const claimUrl = `${env.CLAIM_LINK_BASE}?token=${row.unique_token}`;
  const email = row.email ?? "";

  const text = `Hi ${firstName},

Thank you for your recent Amazon order (${orderNum}) — hope you're enjoying the massager!

We'd like to send you a complimentary Renewera Handheld Wood Bath Roller Massage Brush as a thank-you. Just open the link below, enter your shipping address, and we'll get it out to you:

${claimUrl}

This link works once and expires in 14 days.

If you have any questions just reply to this email.

Rauf
Renewera`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>A note from Renewera</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:8px;padding:40px 40px 32px;">
          <tr>
            <td style="padding-bottom:28px;border-bottom:1px solid #eeeeee;">
              <span style="font-size:15px;font-weight:600;color:#111111;letter-spacing:0.01em;">Renewera</span>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#222222;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#222222;">Thank you for your recent Amazon order (<span style="font-family:'Courier New',monospace;font-size:14px;color:#444444;">${orderNum}</span>) — hope you're enjoying the massager!</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#222222;">We'd like to send you a complimentary <strong>Renewera Handheld Wood Bath Roller Massage Brush</strong> as a thank-you. Just open the link below, enter your shipping address, and we'll get it out to you.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                <tr>
                  <td>
                    <a href="${claimUrl}" style="display:inline-block;padding:13px 28px;background-color:#111111;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;border-radius:6px;">Enter shipping address &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#888888;">Or copy this link:</p>
              <p style="margin:0 0 28px;font-size:12px;word-break:break-all;line-height:1.5;"><a href="${claimUrl}" style="color:#444444;text-decoration:underline;">${claimUrl}</a></p>
              <p style="margin:0 0 28px;font-size:13px;color:#888888;padding-bottom:28px;border-bottom:1px solid #eeeeee;">This link works once and expires in 14 days.</p>
              <p style="margin:0 0 4px;font-size:15px;color:#222222;">Rauf</p>
              <p style="margin:0;font-size:14px;color:#888888;">Renewera &mdash; <a href="mailto:contact@renewera.co" style="color:#888888;text-decoration:none;">contact@renewera.co</a></p>
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
    html,
  };
}
