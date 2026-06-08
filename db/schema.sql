-- ============================================================
--  Renewera Free Gift — Supabase Schema v3
--  Pre-insert model:
--    - Rauf inserts rows with amazon_order_number only (status='new')
--    - Customer form submission UPDATES the row (status='submitted')
--    - Customer claim page UPDATES again (status='ready_to_ship')
--    - Tracking # triggers shipping email (status='shipped')
--
--  Changes from v2:
--    - 4 statuses only: new | submitted | ready_to_ship | shipped
--    - Removed: expired, rejected, rejection_reason
--    - full_name / email now nullable (filled at form submit, not insert)
--    - Added created_at (manual insert time) — submitted_at now means
--      "customer submitted form"
--    - New function order_status(order) returns status info for form
--      validation (exists? available?)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists gift_requests (
  id                      uuid primary key default uuid_generate_v4(),
  status                  text not null default 'new'
                          check (status in ('new', 'submitted', 'ready_to_ship', 'shipped')),

  -- Known at manual insert time (by Rauf)
  amazon_order_number     text not null unique,
  amazon_order_date       text,                                 -- exact Amazon order date string, e.g. '6/8/2026 9:23 AM PDT'

  -- Filled by customer via form.html
  full_name               text,
  email                   text,

  -- Filled by customer via claim.html
  phone                   text,
  shipping_line1          text,
  shipping_line2          text,
  shipping_city           text,
  shipping_state          text,
  shipping_zip            text,
  shipping_country        text default 'US',

  -- Single-use claim link
  unique_token            text not null unique default encode(gen_random_bytes(16), 'hex'),

  -- Tracking (added manually once shipped, or by carrier API later)
  tracking_number         text,
  tracking_url            text,
  carrier                 text,

  -- Metadata
  ip_address              text,
  user_agent              text,
  created_at              timestamptz not null default now(),  -- row inserted
  submitted_at            timestamptz,                          -- form submitted
  email_sent_at           timestamptz,                          -- claim link emailed
  claimed_at              timestamptz,                          -- claim page submitted
  shipped_at              timestamptz,                          -- tracking added / ship email sent
  shipping_email_sent_at  timestamptz                           -- prevents duplicate ship emails
);

-- Indexes
create index if not exists idx_gift_requests_status on gift_requests(status);
create index if not exists idx_gift_requests_email on gift_requests(email);
create index if not exists idx_gift_requests_token on gift_requests(unique_token);
create index if not exists idx_gift_requests_order on gift_requests(amazon_order_number);
create index if not exists idx_gift_requests_tracking_pending
  on gift_requests(tracking_number)
  where status = 'ready_to_ship' and tracking_number is not null and shipping_email_sent_at is null;

-- Row Level Security
alter table gift_requests enable row level security;

-- Admin view
create or replace view admin_requests as
select
  id,
  status,
  amazon_order_number,
  full_name,
  email,
  case
    when shipping_city is not null then shipping_city || ', ' || shipping_state
    else null
  end as location,
  tracking_number,
  carrier,
  created_at,
  submitted_at,
  email_sent_at,
  claimed_at,
  shipped_at
from gift_requests
order by created_at desc;

-- Order status lookup — used by Workflow A to gate form submission.
-- Returns: exists_in_db (order preloaded?), available (status='new'?), current_status
create or replace function order_status(check_order text)
returns table(exists_in_db boolean, available boolean, current_status text)
language sql stable as $$
  select
    exists(select 1 from gift_requests where amazon_order_number = check_order) as exists_in_db,
    exists(select 1 from gift_requests where amazon_order_number = check_order and status = 'new') as available,
    (select status from gift_requests where amazon_order_number = check_order limit 1) as current_status;
$$;

-- Rate-limit helpers (based on submitted_at — actual form-submission time)
create or replace function email_rate_limited(check_email text)
returns boolean language sql stable as $$
  select exists(
    select 1 from gift_requests
    where lower(email) = lower(check_email)
      and submitted_at > now() - interval '24 hours'
  );
$$;

create or replace function ip_submission_count(check_ip text)
returns int language sql stable as $$
  select count(*)::int from gift_requests
  where ip_address = check_ip
    and submitted_at > now() - interval '24 hours';
$$;
