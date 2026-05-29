# Renewera Free Gift

Post-purchase gift fulfillment for Renewera (Amazon FBA heated foot/ankle massager).
Customer scans QR on product packaging → fills the gift form → receives a
single-use claim link → enters a shipping address → gets shipped → gets a
tracking email.

This repo is a monorepo: a static UI deployed to Cloudflare Pages plus a
TypeScript Cloudflare Worker that replaces the previous n8n backend.

## Layout

```
apps/
  web/                Static UI (form + claim page) — Cloudflare Pages
  api/                Cloudflare Worker (Hono + TypeScript)
    src/
      routes/         /api/freegift/submit, verify, claim + /api/internal/shipped
      cron/           Daily housekeeping (reminders, expiry, retries)
      emails/         5 transactional email templates
      lib/            supabase, resend, turnstile, telegram, carrier, hmac, validate
    wrangler.toml     Worker config (route, cron trigger, env vars)
db/
  schema.sql          Current Supabase schema (source of truth)
  migrations/         Forward-only migrations applied via Supabase SQL editor
  webhooks/           Database webhook setup docs
.github/workflows/    CI + deploy-web + deploy-api
```

## Customer flow

1. Rauf pre-inserts a row into `gift_requests` with the Amazon order number
   (status `new`) — manual today, Amazon SP-API integration is roadmap.
2. Customer scans QR → lands at `renewera.co/freegift`, fills name, email,
   order number, passes Turnstile.
3. Worker validates, flips the row to `submitted`, sends the claim-link email
   immediately (via `ctx.waitUntil` — UI responds in <500ms regardless).
4. Customer clicks the link → `renewera.co/freegift/claim?token=...` →
   shipping form → flips the row to `ready_to_ship` → order-confirmation
   email + Telegram alert.
5. Rauf adds `tracking_number` to the row in Supabase. The Supabase Database
   Webhook fires → Worker auto-detects carrier → sends shipping email →
   flips status to `shipped`.

If steps 3 or 4 stall, the daily cron handles it:

- 3 days after the claim link was sent: gentle reminder
- 7 days after: final reminder ("expires in 3 days")
- 10 days after: PII wiped, `unique_token` regenerated, status reset to `new`
  so the order is claimable again. `recycle_count` increments for audit.

The cron also retries any email send that `ctx.waitUntil` failed to deliver.

## Why no every-5-min cron?

The old n8n setup polled every 5 minutes for two things: emails to send. We
replaced both:

- Claim email is now sent synchronously after the form submit (no polling).
- Shipping email is now triggered by a Supabase Database Webhook on the
  `tracking_number` update (event-driven, ~1s latency).

The Worker has **one** cron trigger total — daily at 13:00 UTC — for the
new reminder/expiry logic plus a belt-and-suspenders retry sweep.

## Local development

```bash
# one-time
pnpm install

# Worker dev server (port 8787)
pnpm -F api dev

# Type check
pnpm -F api typecheck

# Tests
pnpm -F api test
```

Local secrets go in `apps/api/.dev.vars` (gitignored). See `.env.example`
for the list of required names.

To test the Pages UI locally pointing at the dev Worker, serve `apps/web`
with any static server and override the `/api/*` URL during testing.

## Deploy

Push to `main`:

- Any change under `apps/api/**` triggers `deploy-api.yml` (wrangler deploy).
- Any change under `apps/web/**` triggers `deploy-web.yml` (Cloudflare Pages).

Both workflows use GitHub Actions and only require two repo-level secrets:
`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Neither contributor needs
local `wrangler login`.

For a manual staging deploy of the Worker:

```bash
gh workflow run deploy-api.yml -f environment=staging
```

## DB migrations

Apply via the Supabase dashboard's SQL editor in order:

```
db/migrations/001_add_reminder_and_recycle.sql
```

The file is idempotent — safe to re-run.

## Database webhook

After applying the migration, configure the tracking-number webhook in
Supabase. Step-by-step in `db/webhooks/README.md`.

## Onboarding a new collaborator

Granting full push + deploy + observability access to a partner. Done by
Rauf once per partner.

1. **GitHub** — invite to `atlashorizonusa/renewera-freegift` with **Write**.
2. **Cloudflare** — invite to the Cloudflare account as
   *Workers Admin + Pages Admin* (least-privilege role for deploy/log).
3. **Supabase** — invite to the project as **Developer** (read schema, run
   SQL, view logs; can't drop the project).
4. **Resend** — share the API key via your team's password manager, or
   create a per-collaborator key.
5. **Telegram** — add to the alert chat (`-5234908131`) so they see daily
   maintenance + failure alerts.
6. Confirm CI passes for them by opening a no-op PR.

Once the above is done, the partner can ship end-to-end without Rauf in
the loop.

## Required GitHub Actions secrets

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens. Scope: Edit Workers + Pages on the renewera.co zone. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Overview (top right). |

## Required Worker secrets

Set with `wrangler secret put NAME` from `apps/api/`:

| Secret | Notes |
|---|---|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only. **Never** committed. |
| `SUPABASE_WEBHOOK_SECRET` | Random 32-byte hex. Same value also pasted into the Supabase webhook's `X-Webhook-Secret` header. |
| `RESEND_API_KEY` | resend.com → API Keys |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → Site → Secret Key |
| `TELEGRAM_BOT_TOKEN` | Talk to @BotFather |

## Rollback

The cutover is reversible until n8n is deleted. To roll back:

1. Revert the PR that swapped the `WEBHOOK_URL` constants in the HTML files.
2. Cloudflare Pages redeploys in ~1 min.
3. n8n webhooks resume serving the frontend.

n8n stays online (workflow paused) for ~30 days post-cutover as a safety
net.
