export interface Env {
  // ── vars (from wrangler.toml) ────────────────────────────────
  TELEGRAM_CHAT_ID: string;
  RESEND_FROM: string;
  CLAIM_LINK_BASE: string;
  TURNSTILE_SITEKEY: string;
  ENVIRONMENT: "production" | "staging";

  // ── secrets (wrangler secret put) ────────────────────────────
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
}

// ── DB rows ────────────────────────────────────────────────────
export type GiftStatus = "new" | "submitted" | "ready_to_ship" | "shipped";

export interface GiftRequest {
  id: string;
  status: GiftStatus;
  amazon_order_number: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  unique_token: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  submitted_at: string | null;
  email_sent_at: string | null;
  claimed_at: string | null;
  shipped_at: string | null;
  shipping_email_sent_at: string | null;
  reminder_3day_sent_at: string | null;
  reminder_7day_sent_at: string | null;
  expired_at: string | null;
  recycle_count: number;
  claim_email_failed: boolean;
  shipping_email_failed: boolean;
}

// ── Wire payloads ──────────────────────────────────────────────
export interface SubmitPayload {
  fullName: string;
  email: string;
  amazonOrderNumber: string;
  turnstileToken: string;
}

export interface VerifyPayload {
  token: string;
}

export interface ClaimPayload {
  token: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export type ErrorCode =
  | "INVALID_INPUT"
  | "INVALID_ORDER_FORMAT"
  | "DISPOSABLE_EMAIL"
  | "INVALID_TURNSTILE"
  | "RATE_LIMITED_EMAIL"
  | "RATE_LIMITED_IP"
  | "ORDER_NOT_FOUND"
  | "ORDER_ALREADY_CLAIMED"
  | "INVALID_TOKEN"
  | "ALREADY_CLAIMED"
  | "EXPIRED"
  | "INTERNAL_ERROR";
