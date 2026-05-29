# Supabase Database Webhooks

The Worker is event-driven for shipping notifications: when Rauf
adds a `tracking_number` to a `gift_requests` row in the Supabase
dashboard, Supabase fires an HTTP POST to the Worker, which sends
the shipping email and flips status to `shipped`.

This eliminates the every-5-minute polling cron that n8n used.

## Setup (one-time, via Supabase dashboard)

1. Open **Database → Webhooks → Create a new hook**.
2. Configure:
   - **Name**: `tracking_added → send_shipping_email`
   - **Table**: `public.gift_requests`
   - **Events**: ☑ Update (only)
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://renewera.co/api/internal/shipped`
   - **HTTP Headers**:
     - `Content-Type: application/json`
     - `X-Webhook-Secret: <SUPABASE_WEBHOOK_SECRET>` — the same
       value set via `wrangler secret put SUPABASE_WEBHOOK_SECRET`
       on the Worker
3. **Trigger condition** (under Conditions):
   ```
   (record.tracking_number IS NOT NULL)
   AND (old_record.tracking_number IS NULL)
   AND (record.status = 'ready_to_ship')
   ```
4. Save.

## Verifying

After creation, the dashboard shows recent webhook deliveries
under the hook's **Logs** tab. Each delivery should return HTTP 200
within ~1 second. If you see 401, the secret header is wrong. If
you see 500, check the Worker's `wrangler tail` output.

## Backup safety net

The Worker's daily cron also re-checks for `status='ready_to_ship'
AND tracking_number IS NOT NULL AND shipping_email_sent_at IS
NULL` and re-sends the shipping email. So a missed webhook costs
at most 24h of email delay.

## Rotating the secret

```bash
# Generate
openssl rand -hex 32

# Set on Worker
cd apps/api && wrangler secret put SUPABASE_WEBHOOK_SECRET

# Update header in Supabase dashboard → Database → Webhooks → Edit
```
