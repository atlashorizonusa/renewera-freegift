-- ============================================================
--  Migration 004 — Replace Supabase webhook triggers with
--  direct net.http_post triggers
--
--  Problem: supabase_functions.http_request (used by the
--  Integrations → Database Webhooks UI) routes through
--  Supabase's internal Edge Functions proxy and silently
--  drops requests to external URLs like renewera.co.
--
--  Fix: drop the UI-created triggers and recreate them using
--  net.http_post directly, which we confirmed works.
--
--  Apply via Supabase SQL editor. Safe to re-run.
-- ============================================================

-- ── Drop UI-created triggers ─────────────────────────────────
DROP TRIGGER IF EXISTS "shipped-email" ON gift_requests;
DROP TRIGGER IF EXISTS "delivered-email" ON gift_requests;

-- ── Shipped webhook trigger ──────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_shipped_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://renewera.co/api/internal/shipped',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret','cb8352e24cfcadf4334801396b50a3c63c0d9828b52e4ae00320338031da2aee'
    ),
    body    := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shipped_webhook ON gift_requests;
CREATE TRIGGER shipped_webhook
  AFTER UPDATE ON gift_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_shipped_webhook();

-- ── Delivered webhook trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_delivered_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://renewera.co/api/internal/delivered',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret','cb8352e24cfcadf4334801396b50a3c63c0d9828b52e4ae00320338031da2aee'
    ),
    body    := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivered_webhook ON gift_requests;
CREATE TRIGGER delivered_webhook
  AFTER UPDATE ON gift_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_delivered_webhook();
