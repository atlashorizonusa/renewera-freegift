# Architecture

## End-to-end data flow

```
Customer
  │
  │  scan QR on product packaging
  ▼
renewera.co/freegift                       [served by Worker via [assets]]
  │
  │  POST {fullName, email, amazonOrderNumber, turnstileToken}
  ▼
renewera.co/api/freegift/submit            [Worker — routes/submit.ts]
  │
  ├─ verify Turnstile token (Cloudflare siteverify)
  ├─ check disposable-email + ZIP + order-format regex
  ├─ rate-limit by email + IP (Supabase RPC functions)
  ├─ order_status() lookup — must exist in DB with status='new'
  ├─ UPDATE gift_requests SET status='submitted', email_sent_at=now()...
  ├─ respond 200 {success:true}
  └─ ctx.waitUntil(send claim email + Telegram notify)
        │
        ├─ Resend API → send claim_link.ts email
        └─ on failure: set claim_email_failed=true, Telegram alert
           (daily cron will retry)


Customer clicks email link → renewera.co/freegift/claim?token=…
                                            [Worker serves apps/web/freegift/claim/index.html]
  │
  │  POST {token}
  ▼
renewera.co/api/freegift/verify            [routes/verify.ts]
  └─ returns {state: 'valid'|'claimed'|'expired'|'invalid', fullName, email, ...}
  │
  │  POST {token, phone, line1, line2, city, state, zip, country}
  ▼
renewera.co/api/freegift/claim             [routes/claim.ts]
  ├─ UPDATE gift_requests SET status='ready_to_ship', shipping_*, claimed_at
  ├─ respond 200
  └─ ctx.waitUntil(send order_confirmation email + Telegram notify)


Rauf adds tracking_number into Supabase row (via Table Editor)
  │
  ▼
Supabase Database Webhook                  [event-driven, no polling]
  │
  │  POST {record: {id, tracking_number, ...}, type: 'UPDATE', old_record: {...}}
  ▼
renewera.co/api/internal/shipped           [routes/internal/shipped.ts]
  ├─ verify x-webhook-secret header (constant-time compare)
  ├─ guard: only act if tracking just became non-null AND status='ready_to_ship'
  ├─ auto-detect carrier from tracking-number format (lib/carrier.ts)
  ├─ send shipped.ts email via Resend
  └─ UPDATE status='shipped', shipped_at, shipping_email_sent_at, carrier, tracking_url


Cloudflare Cron Trigger (0 13 * * *  — daily 8am ET / 9am EDT)
  │
  ▼
runDailyMaintenance(env)                    [cron/daily.ts]
  ├─ Reminder 3-day:  status='submitted' AND email_sent_at < now()-3d
  │                   AND reminder_3day_sent_at IS NULL
  │                   → send reminder_3day.ts + stamp the column
  │
  ├─ Reminder 7-day:  status='submitted' AND email_sent_at < now()-7d
  │                   AND reminder_7day_sent_at IS NULL
  │                   → send reminder_7day.ts + stamp the column
  │
  ├─ Expiry 10-day:   call SQL function recycle_expired_submissions()
  │                   which atomically: clears PII, regenerates unique_token,
  │                   sets status='new', stamps expired_at, increments
  │                   recycle_count — so the order becomes claimable again.
  │
  └─ Retry sweep:     any row with claim_email_failed=true or
                      shipping_email_failed=true → re-send + clear flag on success
                      Also catches ready_to_ship rows that should have shipped
                      but the webhook missed (belt-and-suspenders).
```

## State machine

```
       ┌─────────┐
       │  new    │  (Rauf pre-inserted; awaiting customer submit)
       └────┬────┘
            │ customer fills form
            ▼
       ┌──────────┐
       │ submitted│  (claim email sent; awaiting customer click)
       └────┬─────┘
            │ customer fills shipping form
            ▼  10 days no claim → cron recycles back to 'new'
       ┌───────────────┐
       │ ready_to_ship │  (Rauf needs to ship physically; add tracking_number)
       └────┬──────────┘
            │ tracking_number added → Supabase webhook fires
            ▼
       ┌──────────┐
       │ shipped  │  (terminal; customer has tracking email)
       └──────────┘
```

## Component map

| Component | Lives in | Role |
|---|---|---|
| Static UI | `apps/web/freegift/{index,claim/index}.html` | Form + claim page, embedded CSS/JS |
| Worker entry | `apps/api/src/index.ts` | Hono app + `scheduled` (cron) handler |
| Routes | `apps/api/src/routes/` | Hono sub-apps for each endpoint |
| DB client | `apps/api/src/lib/supabase.ts` | Direct PostgREST over `fetch`, no SDK |
| Email sender | `apps/api/src/lib/resend.ts` | Resend API wrapper |
| CAPTCHA verify | `apps/api/src/lib/turnstile.ts` | Cloudflare siteverify |
| Telegram | `apps/api/src/lib/telegram.ts` | Bot `sendMessage` |
| Carrier detection | `apps/api/src/lib/carrier.ts` | Regex → carrier name + tracking URL |
| HMAC | `apps/api/src/lib/hmac.ts` | Constant-time string compare |
| Validation | `apps/api/src/lib/validate.ts` | Order-format, email, ZIP, disposable check |
| Email bodies | `apps/api/src/emails/*.ts` | 5 templates, plain HTML + text |
| Cron handler | `apps/api/src/cron/daily.ts` | `runDailyMaintenance(env)` |

## Database tables (summary)

`gift_requests` — single primary table. See `db/schema.sql` for the
canonical definition. Notable columns:

- `id` (uuid) — primary key
- `amazon_order_number` — unique per active row
- `unique_token` — opaque ID for the claim link; regenerated on recycle
- `status` — `'new' | 'submitted' | 'ready_to_ship' | 'shipped'`
- `full_name`, `email`, `phone`, `shipping_*` — customer-supplied; nullable on `new` rows
- `email_sent_at`, `claim_email_failed` — claim-email tracking
- `reminder_3day_sent_at`, `reminder_7day_sent_at` — cron stamps these
- `claimed_at`, `shipped_at`, `shipping_email_sent_at`, `shipping_email_failed` — shipping tracking
- `tracking_number`, `carrier`, `tracking_url`
- `expired_at`, `recycle_count` — added by migration 001
- `submitted_at`, `created_at` — audit

Helper SQL functions called via RPC:
- `order_status(check_order text)` — returns `{exists_in_db, available, current_status}`
- `email_rate_limited(check_email text)` — returns bool
- `ip_submission_count(check_ip text)` — returns int
- `recycle_expired_submissions()` — atomic expiry sweep
- `gen_gift_token()` — random 16-char hex token

## Design decisions

### Why one Worker, not split web + api?

Cloudflare consolidated Pages into Workers Static Assets in late 2025; new
accounts can't create standalone Pages projects. The single-Worker pattern
also gives us same-origin requests (no CORS preflight) and one deploy
pipeline instead of two.

### Why PostgREST over the Supabase JS SDK?

The SDK adds ~30KB to the Worker bundle and forces a cold-start dependency
graph. Our use is shallow (a handful of selects/updates/RPCs) and PostgREST
over `fetch` is ~80 lines in `lib/supabase.ts`.

### Why `ctx.waitUntil` for email sends?

Lets the form respond `200` immediately while the (slower) Resend API call
finishes after the response. The customer sees a fast confirmation; the
email arrives a few seconds later. n8n needed a cron to safety-net this
pattern because of webhook restart semantics — Workers don't.

### Why a daily cron instead of every-5-min?

The only inherent need for scheduling is the 3/7/10-day reminder + expiry
logic. Running every 5 minutes for that would check the same rows 288
times for no reason. Shipping notifications and claim-email retries are
event-driven (Supabase webhook + `ctx.waitUntil`), with the daily cron as
a belt-and-suspenders retry sweep.

### Why a constant-time secret compare?

Standard `===` on strings short-circuits on the first mismatch, leaking
information via timing. Our `timingSafeEqual` in `lib/hmac.ts` always
compares all characters. Overkill for this scale, but the function is
~10 lines and removes a class of bug.

### Why TS template literals for emails (not MJML, react-email, etc.)?

Two templates total were in use pre-migration; we now have five. Templating
engines add ~50KB+ to the Worker bundle and a build step. Plain TS template
literals work, are version-controllable, and render in any email client we
care about (verified across Gmail, Outlook, Apple Mail).

## Cost envelope

At expected volume (50–500 orders/month):

| Service | Tier | Notes |
|---|---|---|
| Cloudflare Workers | Free (100K req/day) | Form submits + assets ≈ thousands/day |
| Cloudflare Pages | n/a | Not used — Worker serves assets |
| Supabase | Free | Well under the 500MB / 50K MAU limits |
| Resend | Free (3K emails/mo) | ~3–5 emails per customer; 500 orders ≈ 2K emails |
| Cloudflare Turnstile | Free | Unlimited |
| Telegram | Free | Internal alerts only |

Net infra cost: **$0/month** until we cross Resend's free tier (~600
customers/mo).
