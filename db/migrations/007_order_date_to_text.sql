-- ============================================================
--  Migration 007 — amazon_order_date: timestamptz → text
--
--  timestamptz normalizes to UTC and re-displays in another
--  timezone, so a pasted '6/8/2026 9:23 AM PDT' showed up shifted
--  (e.g. EDT/UTC). Switching to text stores exactly what is
--  pasted — no timezone conversion, ever.
--
--  Tradeoff: text sorts alphabetically, not chronologically.
--  Use created_at (auto entry timestamp) to see what was entered
--  last; amazon_order_date is an exact reference of Amazon's value.
--
--  Apply via Supabase SQL editor.
-- ============================================================

-- Drop the timestamptz index (not useful for text reference field).
DROP INDEX IF EXISTS idx_gift_requests_order_date;

ALTER TABLE gift_requests
  ALTER COLUMN amazon_order_date TYPE text
  USING amazon_order_date::text;
