# Operations runbook

Day-to-day tasks for whoever's on call. Targeted at the partner —
assumes Cloudflare + Supabase + Resend dashboard access but no command-
line tools.

## Common tasks

### Add inventory (pre-create a row for a new order)

Before a customer can claim a gift, the row must already exist in
`gift_requests` with `status='new'`.

1. Supabase → Table Editor → `gift_requests` → **Insert row**.
2. Set:
   - `amazon_order_number`: the exact Amazon order # (format `XXX-XXXXXXX-XXXXXXX`)
   - `status`: `new`
   - `unique_token`: leave blank — DB default fills it
   - All other fields: leave blank (customer fills via the form)
3. Save.

Bulk-add via SQL (faster for 10+ orders):

```sql
INSERT INTO gift_requests (amazon_order_number, status)
VALUES
  ('111-1234567-1234567', 'new'),
  ('222-1234567-1234567', 'new'),
  -- ...
;
```

### Add inventory in bulk

```sql
INSERT INTO gift_requests (amazon_order_number)
VALUES
  ('111-1234567-1234567'),
  ('222-1234567-1234567');
```

Only `amazon_order_number` is needed — `status` defaults to `new` and
`unique_token` is auto-generated.

### Ship a gift (trigger the shipping email)

After you physically hand the package to UPS/USPS/FedEx and get a
tracking number:

1. Supabase → Table Editor → `gift_requests` → find the row (filter by
   `status='ready_to_ship'` or by customer email).
2. Edit `tracking_number` → paste the carrier's tracking number → Save.
3. Within ~5 seconds:
   - The Supabase Database Webhook fires.
   - The Worker auto-detects the carrier from the number format.
   - A "your gift has shipped" email goes to the customer.
   - `status` flips to `shipped`, `shipped_at` and `shipping_email_sent_at`
     get populated.

If you want to override the carrier detection (e.g., the auto-detect
guessed wrong), set `carrier` and `tracking_url` in the same row edit.
The Worker honors any non-empty values you set.

### Mark a gift as delivered (trigger delivery email)

After the carrier marks the package delivered:

1. Supabase → Table Editor → `gift_requests` → find the row (filter by
   `status='shipped'`).
2. Set `delivered_at` to the current time (e.g. `now()` or the timestamp
   shown by the carrier) → Save.
3. Within ~5 seconds:
   - The Supabase Database Webhook fires.
   - A "your gift has arrived" email goes to the customer with an Amazon
     review CTA.
   - `status` flips to `delivered`, `delivery_email_sent_at` gets stamped.

If the delivery email fails, `delivery_email_failed` is set to `true` and
the daily cron retries it automatically.

### View live logs (debug what's happening right now)

Cloudflare dashboard → Workers & Pages → `renewera-freegift` → **Logs**
tab → **Begin log stream**.

Then trigger the action you want to see. Each request shows up with:
- HTTP method + URL
- Status code (200 / 400 / 401 / 500)
- Any `console.log` / `console.error` output from the code

This is the single most useful debug tool. If something isn't working,
open the log stream first.

### Look up an order's state

Supabase → Table Editor → `gift_requests` → filter by `email` or
`amazon_order_number`. Check:

- `status` — which step the order is at (`new → submitted → ready_to_ship → shipped → delivered`)
- `email_sent_at` — when the claim email went out
- `reminder_3day_sent_at`, `reminder_7day_sent_at` — whether reminders fired
- `claim_email_failed`, `shipping_email_failed`, `delivery_email_failed` — whether something blew up
- `delivered_at`, `delivery_email_sent_at` — delivery tracking
- `expired_at`, `recycle_count` — whether/when the claim link expired (14-day expiry; info is kept, status stays `submitted`)

### Check whether an email actually delivered

resend.com → **Logs** → search by recipient email. Resend shows:
- Status (delivered, bounced, opened)
- Subject + From
- Full HTML preview of what was sent

If the Worker thinks it sent an email but the customer doesn't have it,
this is where you find out the truth.

### Rotate a Worker secret

Anything in the Worker → Settings → Variables and Secrets list, e.g.
after a partner leaves or a key was leaked:

1. Generate a new value (for `SUPABASE_WEBHOOK_SECRET`: run
   `openssl rand -hex 32` in any terminal).
2. Worker → Settings → Variables and Secrets → click the secret name
   → **Edit** → paste new value → Save.
3. **If it's a shared secret**, update the other end too. The only one
   that has another end is `SUPABASE_WEBHOOK_SECRET` — also update the
   Supabase webhook's `x-webhook-secret` header.

The Worker hot-reloads automatically. Test by re-triggering the relevant
flow.

### Manually trigger the daily cron

Useful when you want to send reminders or run the expiry sweep without
waiting until 13:00 UTC.

1. Cloudflare → Worker → Settings → Triggers → **Send test event**.
2. The handler runs immediately. Watch the log stream for output —
   you'll see entries like `cron: reminder_3day sent for row …`.

There is no destructive risk: the cron is idempotent. Running it twice
in one day just re-checks (and skips) rows whose reminder columns are
already stamped.

### Roll back a bad deploy

1. Cloudflare → Worker → **Deployments** tab.
2. Find the previous good version (look at the timestamp + commit message).
3. Three-dot menu → **Rollback to this version** → confirm.
4. The previous version is live within ~10 seconds. No re-build needed.

Then fix the bug, push a new commit, and Workers Builds redeploys.

## Less common tasks

### Apply a new DB migration

1. Pull `main` to read the migration file.
2. Supabase → **SQL Editor** → **New query** → paste contents → **Run**.
3. Verify in Table Editor that the change took effect.
4. (Optional) Update `db/schema.sql` to reflect the new state and commit.

Migrations are idempotent and forward-only. We don't track them in a
separate state table; the file numbers `001_…`, `002_…` are documentation
order, not enforced.

### Add a new email template

1. Create `apps/api/src/emails/<name>.ts` exporting a function that takes
   the row + any per-send vars and returns `{to, subject, html, text}`.
2. Reference it in whichever route or cron job sends it.
3. Test the rendering locally: `pnpm -F api dev`, hit the relevant endpoint.

Use any existing template as a starting point — they're all the same
shape.

### Fix a stuck `submitted` row whose claim email never went

`claim_email_failed = true` and `email_sent_at IS NULL`:

- The daily cron's retry sweep will re-send within 24h. If you want it
  sooner, run the cron manually (above).
- If the retry also fails, check resend.com logs for the actual error
  (suspended account, invalid recipient, etc.) and fix at the Resend
  level. Then manually clear `claim_email_failed = false` and re-run the
  cron.

### Fix a stuck `shipped` row whose delivery email never went

`delivery_email_failed = true` or `delivered_at` is set but `delivery_email_sent_at IS NULL`:

- The daily cron retry sweep will re-send within 24h.
- For immediate fix: manually trigger the cron (see above).
- If it keeps failing, check resend.com logs for the actual error, fix it,
  clear `delivery_email_failed = false`, and re-run the cron.

### Fix a stuck `ready_to_ship` row whose shipping email never went

`shipping_email_failed = true` or webhook never fired:

- Confirm the row actually has a non-null `tracking_number` and `status =
  'ready_to_ship'`.
- Re-save the `tracking_number` (clear it, save, paste it back, save) —
  that re-triggers the Database Webhook event.
- Watch the log stream during the second save to see what the Worker
  actually does.

### Add a new carrier to the auto-detect

Edit `apps/api/src/lib/carrier.ts`. Add the regex pattern + carrier name +
tracking URL builder. Tests in `apps/api/test/carrier.test.ts` — add one
covering the new pattern. Push to main; deploys in ~90s.

## Things you should never do without thinking

- **Delete a row in `gift_requests`.** The 14-day link expiry keeps the row
  (info + `submitted` status) for follow-up, which is almost always what you
  want. Deleting loses audit history.
- **Hard-delete the Supabase project.** Obvious, but: Supabase doesn't
  back up free-tier projects automatically. Take a manual export first.
- **Change the Worker's Custom Domain bindings.** If you remove
  `renewera.co`, the customer-facing site goes dark immediately. There is
  no Pages project to fall back to.
- **Rotate `SUPABASE_WEBHOOK_SECRET` on only one side.** If the Worker
  value differs from the Supabase webhook header, all shipping
  notifications start returning 401 silently. The daily cron retry sweep
  catches them within 24h, but customers get delayed emails. Always
  update both ends in the same minute.
- **Push directly to `main` without typecheck or tests.** Workers Builds
  will deploy whatever you push, broken or not. CI runs on PRs only.

## When stuck

In order of who to ask:

1. The Worker log stream — answers most questions within 30 seconds.
2. CLAUDE.md → gotchas section — the migration learnings are written
   there for exactly this moment.
3. Resend / Supabase / Cloudflare dashboards — each has its own logs.
4. Telegram chat `-5234908131` — the daily summary often surfaces the
   problem you're chasing.
5. Rauf (until partner has been on call for ~30 days unsupervised).
