-- ============================================================
--  Migration 005 — enforce unique order numbers + order date
--
--  Two problems this fixes:
--
--  1. The live table was MISSING the UNIQUE constraint on
--     amazon_order_number (the schema.sql snapshot claimed it,
--     but the real DB never had it — confirmed by a duplicate
--     insert succeeding). This lets the same order be entered
--     twice. Verified there are currently zero duplicates, so
--     the constraint can be added safely without cleanup.
--
--  2. Add amazon_order_date — a date you paste in when adding a
--     row, so the table can be sorted by the actual Amazon order
--     date. (created_at already records when YOU entered the row;
--     this new column records when the customer ordered.)
--
--  Apply via Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Unique constraint on amazon_order_number ─────────────
-- Guarded so re-running is safe (ADD CONSTRAINT isn't idempotent
-- on its own).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gift_requests_amazon_order_number_key'
  ) THEN
    ALTER TABLE gift_requests
      ADD CONSTRAINT gift_requests_amazon_order_number_key
      UNIQUE (amazon_order_number);
  END IF;
END $$;

-- ── 2. amazon_order_date column ─────────────────────────────
ALTER TABLE gift_requests
  ADD COLUMN IF NOT EXISTS amazon_order_date date;

-- Index so sorting / filtering by order date stays fast.
CREATE INDEX IF NOT EXISTS idx_gift_requests_order_date
  ON gift_requests(amazon_order_date);
