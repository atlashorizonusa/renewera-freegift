# Renewera Free Gift

Post-purchase gift fulfillment for Renewera (Amazon FBA heated foot/ankle
massager). Customer scans QR on product packaging → fills the gift form →
receives a single-use claim link → enters a shipping address → gets shipped
→ gets a tracking email.

The whole system runs as **one Cloudflare Worker** that serves both the
static UI and the API on `renewera.co`, backed by a Supabase Postgres DB.
Resend sends mail, Cloudflare Turnstile gates the form, a Telegram bot
posts internal alerts.

## Layout

```
apps/
  web/                Static UI — served by the Worker via [assets]
    freegift/         Customer-facing form (index.html)
    freegift/claim/   Claim page — 2-col layout: image carousel + form
    images/           Product images served at /images/filename (drop files here)
    _headers          Cache-Control: no-store for HTML pages
    _redirects        / → /freegift
  api/                Cloudflare Worker (Hono + TypeScript)
    src/
      index.ts        Hono app + scheduled (cron) handler
      routes/         /api/freegift/{submit,verify,claim}
                      /api/internal/{shipped,delivered}
      cron/           Daily housekeeping (reminders, expiry, retries)
      emails/         6 transactional templates (claim_link, order_confirmation,
                      reminder_3day, reminder_7day, shipped, delivered)
      lib/            supabase, resend, turnstile, telegram, carrier, hmac, validate
    wrangler.toml     Worker config (cron, [assets], [vars])
    test/             vitest unit tests
db/
  schema.sql          Current Supabase schema — source of truth
  migrations/         Forward-only migrations, applied via Supabase SQL editor
  webhooks/           Database webhook setup docs
docs/                 Architecture diagram + operations runbook
.github/workflows/    CI (typecheck + tests) + manual-fallback deploy
CLAUDE.md             Context for AI agents working on this repo
```

## Customer flow

1. Rauf (or partner) pre-inserts a row into `gift_requests` with the Amazon
   order number (status `new`).
2. Customer scans QR → lands at `renewera.co/freegift`, fills name, email,
   order number, passes Turnstile.
3. Worker validates, flips the row to `submitted`, sends the claim-link
   email immediately via `ctx.waitUntil` (UI responds in <500ms regardless).
4. Customer clicks the link → `renewera.co/freegift/claim?token=...` →
   shipping form → row flips to `ready_to_ship` → order-confirmation email
   + Telegram alert.
5. Rauf adds `tracking_number` to the row in Supabase. The Supabase Database
   Webhook fires → Worker auto-detects carrier → shipping email → row
   flips to `shipped`.
6. Rauf sets `delivered_at` on the row once delivery is confirmed. A second
   Supabase webhook fires → delivery confirmation email + Amazon review CTA
   → row flips to `delivered`.

If steps 3 or 4 stall, the daily cron handles it:

- 3 days after the claim link was sent: gentle reminder.
- 11 days after: final reminder ("expires in 3 days").
- 14 days after: the claim link expires — `unique_token` is regenerated (the
  old link stops working and shows a contact-support screen) and `expired_at`
  is stamped. The row **keeps** its `full_name`/`email` and **stays
  `submitted`** (it is NOT wiped and does NOT return to inventory), so
  "submitted but never ordered" stays auditable. `recycle_count` increments.

The cron also retries any email send that `ctx.waitUntil` failed.

See [`docs/architecture.md`](docs/architecture.md) for the full data-flow
diagram.

## Deployment model

**Cloudflare Workers Builds** auto-deploys on every push to `main`:
- Connects to this GitHub repo, runs `pnpm install` then `npx wrangler deploy`
  from `apps/api/`.
- The `[assets]` block in `apps/api/wrangler.toml` points at `../web` so the
  Worker serves both the static frontend and the API.
- Custom Domains `renewera.co` and `www.renewera.co` are bound to this
  Worker (set once in the dashboard).

There is **no separate Cloudflare Pages project** — Cloudflare consolidated
Pages into Workers in late 2025. If a doc or tutorial mentions creating a
Pages project, ignore it.

The `.github/workflows/deploy-api.yml` workflow exists as a manual fallback
only (`workflow_dispatch`). It won't fire on push.

## Local development

```bash
# one-time
pnpm install

# Worker dev server (port 8787) — runs both static + API locally
pnpm -F api dev

# Type check + tests
pnpm -F api typecheck
pnpm -F api test
```

Local secrets go in `apps/api/.dev.vars` (gitignored). See `.env.example`
for the names you need.

## Database migrations

Apply each in order, via Supabase dashboard → SQL Editor. Each file is
idempotent and safe to re-run.

```
db/migrations/001_add_reminder_and_recycle.sql
db/migrations/002_add_delivered.sql
```

## Day-to-day operations

See [`docs/operations.md`](docs/operations.md) — runbooks for the partner:
adding inventory, marking a row shipped, rotating secrets, viewing logs,
debugging a stuck order, manually triggering the daily cron.

## Onboarding a new collaborator

1. **GitHub** — invite to `atlashorizonusa/renewera-freegift` with **Write**.
2. **Cloudflare** — invite to the account as *Workers Admin*.
3. **Supabase** — invite to the project as **Developer**.
4. **Resend** — share the API key via password manager, or mint a per-person key.
5. **Telegram** — add to the alerts chat (`-5234908131`).
6. Confirm CI passes for them by opening a no-op PR.

After this, the partner can ship end-to-end without Rauf in the loop.

## Worker secrets (set in Cloudflare dashboard)

Cloudflare → Worker → Settings → Variables and Secrets → Add (Type: Secret):

| Name | Value source |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `sb_secret_…` |
| `SUPABASE_WEBHOOK_SECRET` | `openssl rand -hex 32` — same value pasted into the Supabase webhook's `x-webhook-secret` header |
| `RESEND_API_KEY` | resend.com → API Keys |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → site → Secret Key |
| `TELEGRAM_BOT_TOKEN` | @BotFather → your bot |

Plaintext vars (`TELEGRAM_CHAT_ID`, `RESEND_FROM`, `CLAIM_LINK_BASE`,
`TURNSTILE_SITEKEY`, `ENVIRONMENT`) are committed in `wrangler.toml` and
re-applied on every deploy.

## Rollback

If a bad deploy needs reverting:

1. Cloudflare → Worker → **Deployments** → find the previous good version → **Rollback to this version**. Live within ~10 seconds.
2. For a deeper revert, `git revert <sha> && git push` — Workers Builds redeploys.

## More

- [`CLAUDE.md`](CLAUDE.md) — context for AI agents working on this repo (Claude Code, Cursor, etc.)
- [`docs/architecture.md`](docs/architecture.md) — system diagram + decision rationale
- [`docs/operations.md`](docs/operations.md) — partner runbook for common tasks
- [`db/webhooks/README.md`](db/webhooks/README.md) — Supabase Database Webhook setup
