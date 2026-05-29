# CLAUDE.md — context for AI agents working on this repo

> Read this first if you're an AI agent (Claude Code, Cursor, Aider, etc.)
> picking up work on Renewera Free Gift. It captures the live system state
> and the non-obvious gotchas. Code conventions and architecture you can
> derive from the source; this file covers what you *can't* derive.

## What this system does

A post-purchase gift fulfillment flow for Renewera, an Amazon FBA brand. A
customer buys a heated foot/ankle massager, scans the QR code on packaging,
fills a form with their order number, gets a claim link, fills shipping
details, and ultimately gets a "shipped" email with a tracking link. See
`README.md` for the customer-journey detail.

It used to run on n8n (a no-code workflow tool) with a polling cron every
5 minutes. It was migrated to a single Cloudflare Worker in May 2026.

## Deployment model — the most important thing to know

**One Worker. One deploy. One domain.**

- The Cloudflare Worker named `renewera-freegift` serves both the static
  HTML (form + claim page) **and** the API (`/api/*` routes), via the
  `[assets]` binding in `apps/api/wrangler.toml` that points at `../web`.
- The Worker is bound as a Custom Domain to `renewera.co` and
  `www.renewera.co`. All traffic to those hostnames flows through it.
- **There is no Cloudflare Pages project.** Cloudflare consolidated Pages
  into Workers (static assets feature) in late 2025; new accounts can't
  create a standalone Pages project. If you read older docs that say "set
  up a Pages project", ignore them.
- Deployment is automatic via **Cloudflare Workers Builds**. On every push
  to `main`, Cloudflare runs `pnpm install` then `npx wrangler deploy`
  from `apps/api/`. No GitHub Actions deploy runs (the workflow file is a
  manual fallback only).

## Where things live

| Concern | Location | Notes |
|---|---|---|
| Application code | this repo, `apps/api/src/` | Hono + TypeScript |
| Static HTML | `apps/web/freegift/index.html` and `apps/web/freegift/claim/index.html` | Embedded CSS + inline JS |
| Worker secrets | Cloudflare dashboard → Worker → Variables and Secrets | Never committed; see README for the list |
| Database schema | `db/schema.sql` (snapshot) + live Supabase project | Source of truth is Supabase; snapshot updated by hand |
| Migrations | `db/migrations/` | Apply manually via Supabase SQL Editor; no migration runner |
| Cron schedule | `apps/api/wrangler.toml` `[triggers]` | Daily 13:00 UTC |
| Email templates | `apps/api/src/emails/*.ts` | TS template literals, no MJML or templating engine |
| Supabase Database Webhook | Supabase dashboard → Database → Webhooks | Fires `POST /api/internal/shipped` when `tracking_number` is added |
| Live logs | Cloudflare dashboard → Worker → Logs (real-time stream) | `[observability]` enabled in wrangler.toml |
| Telegram alerts | Bot in chat `-5234908131` | Daily cron posts a summary; failures post immediately |

## Gotchas we hit during the migration — don't repeat them

These were costly to discover. Save the next session.

### 1. `wrangler versions upload` vs `wrangler deploy`

Cloudflare Workers Builds defaults the deploy command to `npx wrangler
versions upload`, which **uploads a new version but does not activate it**.
The Worker stays on the previous active version. Symptom: build succeeds,
but new code doesn't take effect.

**Fix:** Worker → Settings → Build → change deploy command to `npx wrangler
deploy`. `wrangler.toml`'s `[assets]` is also only respected by `wrangler
deploy`, not `versions upload`.

### 2. Custom Domains shadow other services on the same hostname

A Custom Domain on a Worker means **all** traffic for that hostname goes to
that Worker — even if you have other Workers or Pages projects with the
same hostname. Routes are different: a Route like `renewera.co/api/*` only
intercepts matching paths and leaves the rest alone.

If you bind `renewera.co` as a Custom Domain to a Worker that only handles
`/api/*`, then `renewera.co/freegift` returns Hono's `notFound` (404) and
the static site goes dark.

### 3. Workers Builds doesn't always apply `[[routes]]` from wrangler.toml

You may have to bind routes manually in the dashboard (Worker → Domains &
Routes → Add Route) after the first deploy. This bit us once. If a fresh
`curl https://renewera.co/api/health` returns 404, check Domains & Routes
before assuming the code is broken.

### 4. Route pattern apex vs subdomain

`*.renewera.co/api/*` matches subdomains only (`www`, `api`, etc.), **not**
the apex `renewera.co/api/*`. If you need both, bind both routes.

### 5. Static assets win first, then fall through to the Worker code

With `[assets] directory = "../web"`, requests are matched against static
files first. Only unmatched paths reach Hono. This is why `/freegift/` and
`/api/health` both work in the same Worker — `/freegift/` serves
`apps/web/freegift/index.html`, `/api/health` falls through to Hono.

A consequence: don't add a Hono route at `/freegift/*` thinking you'll
dynamically render it. The asset handler will get there first.

### 6. Supabase API key format changed

New projects use `sb_publishable_...` (formerly `anon`) and `sb_secret_...`
(formerly `service_role` JWT). The Worker's `SUPABASE_SERVICE_ROLE_KEY`
should be the `sb_secret_...` value. Same behavior with PostgREST.

### 7. The webhook secret must match exactly

Header `x-webhook-secret` (lowercase, hyphen) on the Supabase side **and**
the `SUPABASE_WEBHOOK_SECRET` Worker secret. Any whitespace or case
mismatch returns 401. Worker uses `timingSafeEqual` in `lib/hmac.ts`.

## How to develop locally

```bash
pnpm install
pnpm -F api dev        # http://localhost:8787, serves both static + API
pnpm -F api typecheck
pnpm -F api test
```

Local secrets: create `apps/api/.dev.vars` with one `KEY=value` per line.
See `.env.example` for names. Never commit `.dev.vars`.

## How to deploy

Just push to `main`. Workers Builds picks up the push, runs `pnpm install
&& npx wrangler deploy` from `apps/api/`, and the Worker is live within
~90 seconds. Watch the build at Cloudflare dashboard → Worker →
Deployments tab.

If Workers Builds is down or you need staging: trigger
`.github/workflows/deploy-api.yml` manually via the GitHub Actions UI.

## How to debug a problem in production

1. **Live logs first.** Cloudflare → Worker → Logs → "Begin log stream",
   then reproduce. Each request shows status code and any `console.log` /
   `console.error` output.
2. **Check the row.** Open Supabase → Table Editor → `gift_requests` →
   find the row in question. Look at `status`, `email_sent_at`,
   `claim_email_failed`, `shipping_email_failed`. These tell you which
   step failed.
3. **Check Resend.** resend.com dashboard → Logs → search by `to` address.
   You'll see whether the email was actually sent and whether it bounced.
4. **Re-trigger.** For a stuck `ready_to_ship` row missing tracking: just
   add (or re-save) the `tracking_number` — the Database Webhook fires
   again. For a stuck `submitted` row: the daily cron will retry within
   24h, or you can manually invoke via `wrangler tail` + scheduled trigger.

`docs/operations.md` has the full debug runbook with copy-paste commands.

## What you can change freely vs what needs care

**Freely:**
- Email template wording (`apps/api/src/emails/*.ts`).
- Validation rules (`apps/api/src/lib/validate.ts`).
- Carrier patterns (`apps/api/src/lib/carrier.ts`).
- Tests and new routes.

**Carefully (paired changes):**
- DB column names: the Worker references many of them by string in
  `lib/supabase.ts` calls. Renaming requires a migration + Worker change.
- Webhook secret name: changing the env var name requires updating both
  Cloudflare and Supabase webhook config.
- The status state machine: `new → submitted → ready_to_ship → shipped`.
  Other code (cron, webhook guard) filters on these — adding states needs
  cascading updates.

**Don't touch without strong reason:**
- The `[assets]` directory path or `not_found_handling`.
- The Custom Domain bindings on the Worker.
- The Supabase Database Webhook condition.
- The cron schedule (`0 13 * * *` is intentional — 8am ET, 9am EDT).
