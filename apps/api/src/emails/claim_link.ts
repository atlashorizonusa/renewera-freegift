import type { EmailMessage } from "../lib/resend";
import type { GiftRequest, Env } from "../types";

export function buildClaimLinkEmail(env: Env, row: GiftRequest): EmailMessage {
  const fullName = row.full_name ?? "";
  const firstName = fullName.split(" ")[0] || fullName;
  const claimUrl = `${env.CLAIM_LINK_BASE}?token=${row.unique_token}`;
  const email = row.email ?? "";

  const text = `Hi ${firstName},

As a thank-you for being a customer, we'd like to send you a complimentary Renewera Handheld Wood Bath Roller Massage Brush. Open the link below to enter your shipping address and we'll send it out right away:

${claimUrl}

This link is single-use and expires in 14 days.

We'd be happy if you could take a moment to leave a quick honest review on Amazon for your Renewera foot massager — it would mean the world to a small US company like ours and genuinely helps us keep going:
https://www.amazon.com/your-orders

Questions? Reply to this email or write contact@renewera.co.

— The Renewera team`;

  return {
    to: email,
    subject: "Your Renewera gift link is ready",
    text,
  };
}
