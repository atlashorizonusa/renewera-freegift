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
--
--  IMPORTANT: send only minimal fields, NOT row_to_json(NEW).
--  Sending full row data (especially user_agent, ip_address) triggers
--  Cloudflare WAF OWASP rules → 403 error 1020. The Worker fetches
--  the full row itself after receiving the minimal hint.
--
--  Also: ENABLE ALWAYS so trigger fires even when PostgREST sets
--  session_replication_role = replica (which it may do internally).
CREATE OR REPLACE FUNCTION trigger_shipped_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE req_id bigint;
BEGIN
  SELECT net.http_post(
    url     := 'https://renewera.co/api/internal/shipped',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret','cb8352e24cfcadf4334801396b50a3c63c0d9828b52e4ae00320338031da2aee'
    ),
    body    := jsonb_build_object(
      'type',  TG_OP,
      'table', TG_TABLE_NAME,
      'record', jsonb_build_object(
        'id',                  NEW.id,
        'tracking_number',     NEW.tracking_number,
        'status',              NEW.status,
        'shipping_email_sent_at', NEW.shipping_email_sent_at
      ),
      'old_record', jsonb_build_object(
        'tracking_number', OLD.tracking_number
      )
    )
  ) INTO req_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shipped_webhook ON gift_requests;
CREATE TRIGGER shipped_webhook
  AFTER UPDATE ON gift_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_shipped_webhook();

ALTER TABLE gift_requests ENABLE ALWAYS TRIGGER shipped_webhook;

-- ── Delivered webhook trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_delivered_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE req_id bigint;
BEGIN
  SELECT net.http_post(
    url     := 'https://renewera.co/api/internal/delivered',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret','cb8352e24cfcadf4334801396b50a3c63c0d9828b52e4ae00320338031da2aee'
    ),
    body    := jsonb_build_object(
      'type',  TG_OP,
      'table', TG_TABLE_NAME,
      'record', jsonb_build_object(
        'id',                    NEW.id,
        'delivered_at',          NEW.delivered_at,
        'status',                NEW.status,
        'delivery_email_sent_at', NEW.delivery_email_sent_at
      ),
      'old_record', jsonb_build_object(
        'delivered_at', OLD.delivered_at
      )
    )
  ) INTO req_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivered_webhook ON gift_requests;
CREATE TRIGGER delivered_webhook
  AFTER UPDATE ON gift_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_delivered_webhook();

ALTER TABLE gift_requests ENABLE ALWAYS TRIGGER delivered_webhook;
