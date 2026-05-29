-- ============================================================
--  Migration 001 — Reminder + Recycle support
--
--  Adds columns + indexes + helpers needed by the new Cloudflare
--  Worker for:
--    * 3-day claim-link reminder email
--    * 7-day final reminder email
--    * 10-day expiry sweep (PII wipe + status recycle to 'new')
--    * Retry sweep for failed claim / shipping emails
--
--  Additive only. Existing n8n workflow continues to function
--  during the cutover window (it ignores the new columns).
--
--  Apply via Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================

alter table gift_requests
  add column if not exists reminder_3day_sent_at  timestamptz,
  add column if not exists reminder_7day_sent_at  timestamptz,
  add column if not exists expired_at             timestamptz,
  add column if not exists recycle_count          int  not null default 0,
  add column if not exists claim_email_failed     boolean not null default false,
  add column if not exists shipping_email_failed  boolean not null default false;

-- Reminder + expiry sweep query targets these
create index if not exists idx_gift_requests_reminder_due
  on gift_requests (email_sent_at)
  where status = 'submitted' and reminder_7day_sent_at is null;

-- Retry sweep targets these
create index if not exists idx_gift_requests_retry_due
  on gift_requests (id)
  where claim_email_failed = true or shipping_email_failed = true;

-- Helper used by the expiry-recycle path to regenerate a fresh
-- single-use claim token when a row is reset to 'new'.
create or replace function gen_gift_token() returns text
language sql volatile as $$
  select encode(gen_random_bytes(16), 'hex');
$$;

-- Atomic expiry-recycle helper. Worker daily-cron uses this to
-- avoid racing the claim handler. Only touches status='submitted'
-- rows older than 10 days. Returns the rows it recycled.
create or replace function recycle_expired_submissions()
returns table(id uuid, amazon_order_number text, email text)
language plpgsql as $$
begin
  return query
  update gift_requests
    set status                = 'new',
        full_name             = null,
        email                 = null,
        ip_address            = null,
        user_agent            = null,
        submitted_at          = null,
        email_sent_at         = null,
        reminder_3day_sent_at = null,
        reminder_7day_sent_at = null,
        claimed_at            = null,
        unique_token          = gen_gift_token(),
        expired_at            = now(),
        recycle_count         = gift_requests.recycle_count + 1
  where status = 'submitted'
    and email_sent_at is not null
    and email_sent_at < now() - interval '10 days'
  returning gift_requests.id, gift_requests.amazon_order_number, gift_requests.email;
end;
$$;
