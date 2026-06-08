-- ============================================================
--  Migration 006 — amazon_order_date: date → timestamptz
--
--  The `date` type rejects a value that includes a time, so the
--  full Amazon order timestamp (e.g. '6/8/2026 9:23 AM PDT')
--  couldn't be pasted in. timestamptz accepts the full string
--  AND still sorts chronologically.
--
--  Column was just added and is empty, so the cast is trivial.
--  Apply via Supabase SQL editor.
-- ============================================================

ALTER TABLE gift_requests
  ALTER COLUMN amazon_order_date TYPE timestamptz
  USING amazon_order_date::timestamptz;

-- Sanity check — confirms Postgres parses the Amazon format.
-- Should return: 2026-06-08 ... (a timestamp), no error.
SELECT '6/8/2026 9:23 AM PDT'::timestamptz AS parses_ok;
