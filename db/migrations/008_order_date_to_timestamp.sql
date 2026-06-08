-- ============================================================
--  Migration 008 — amazon_order_date: text → timestamp (no tz)
--
--  Goal: a real date/time field (so it sorts chronologically),
--  that accepts a pasted Amazon value like '6/7/2026 6:00 PM PDT'
--  and shows the EXACT time entered — no timezone shifting.
--
--  `timestamp without time zone` does this: when the input
--  includes a timezone (PDT), Postgres silently IGNORES it and
--  stores the literal wall-clock value. No UTC conversion, no
--  display shift.
--
--  Apply via Supabase SQL editor.
-- ============================================================

ALTER TABLE gift_requests
  ALTER COLUMN amazon_order_date TYPE timestamp without time zone
  USING amazon_order_date::timestamp without time zone;

-- Index so sorting by order date stays fast.
CREATE INDEX IF NOT EXISTS idx_gift_requests_order_date
  ON gift_requests(amazon_order_date);

-- Sanity check — should return 2026-06-07 18:00:00 (6 PM kept, PDT ignored).
SELECT '6/7/2026 6:00 PM PDT'::timestamp without time zone AS exact_time_kept;
