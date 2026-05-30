-- ============================================================
--  Migration 003 — RLS policies + view security hardening
--
--  Problem 1: gift_requests has RLS enabled but no policies.
--  Supabase warns "no data will be returned" — this is safe
--  by default but the intent should be explicit.
--
--  Problem 2: admin_requests is a view that runs as the
--  definer (postgres) by default. This means an anon client
--  hitting the Data API with the publishable key could bypass
--  gift_requests RLS and read all rows. Fix: security_invoker.
--
--  The Worker uses SUPABASE_SERVICE_ROLE_KEY which bypasses
--  RLS entirely — nothing here affects the Worker.
--
--  Apply via Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================

-- ── gift_requests: explicit deny for all public roles ────────
-- Service role bypasses RLS and is unaffected.
-- anon and authenticated get nothing via the Data API.

DROP POLICY IF EXISTS "no_public_access" ON gift_requests;

CREATE POLICY "no_public_access" ON gift_requests
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ── admin_requests view: run as invoker not definer ──────────
-- Recreate with security_invoker=true (PostgreSQL 15+).
-- Now when anon queries this view, it runs as anon → hits
-- gift_requests RLS → policy denies → returns nothing.

CREATE OR REPLACE VIEW admin_requests
  WITH (security_invoker = true)
AS
SELECT
  id,
  status,
  amazon_order_number,
  full_name,
  email,
  CASE
    WHEN shipping_city IS NOT NULL THEN shipping_city || ', ' || shipping_state
    ELSE NULL
  END AS location,
  tracking_number,
  carrier,
  created_at,
  submitted_at,
  email_sent_at,
  claimed_at,
  shipped_at,
  delivered_at
FROM gift_requests
ORDER BY created_at DESC;

-- Revoke direct Data API access from public roles on the view
-- (belt-and-suspenders on top of security_invoker)
REVOKE ALL ON admin_requests FROM anon, authenticated;
