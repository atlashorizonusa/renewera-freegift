-- ============================================================
--  Migration 002 — Delivered status + delivery email tracking
--
--  Adds 'delivered' to the status state machine and the columns
--  needed to track delivery confirmation emails.
--
--  The Supabase Database Webhook fires POST /api/internal/delivered
--  when delivered_at is set on a shipped row. Same pattern as the
--  shipped webhook.
--
--  Apply via Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================

-- Extend the status check constraint to include 'delivered'.
-- The auto-generated constraint name is gift_requests_status_check.
ALTER TABLE gift_requests
  DROP CONSTRAINT IF EXISTS gift_requests_status_check;

ALTER TABLE gift_requests
  ADD CONSTRAINT gift_requests_status_check
  CHECK (status IN ('new', 'submitted', 'ready_to_ship', 'shipped', 'delivered'));

-- New columns
ALTER TABLE gift_requests
  ADD COLUMN IF NOT EXISTS delivered_at           timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_email_failed  boolean NOT NULL DEFAULT false;

-- Index for daily retry sweep
CREATE INDEX IF NOT EXISTS idx_gift_requests_delivery_retry
  ON gift_requests (id)
  WHERE delivery_email_failed = true OR
        (status = 'shipped' AND delivered_at IS NOT NULL AND delivery_email_sent_at IS NULL);
