-- ============================================================
--  Migration 009 — expire claim links WITHOUT wiping submitter info
--
--  Old behavior (recycle): after 10 days, an unclaimed 'submitted'
--  row was reset to 'new', its name/email/etc. were blanked, and the
--  order returned to inventory.
--
--  New behavior: after 14 days, only the claim LINK expires — the
--  token is regenerated (old link stops working) and expired_at is
--  stamped. The row KEEPS status='submitted' and all entered info, so
--  you can audit "who submitted but never ordered" (status='submitted'),
--  and see whose link lapsed (expired_at is not null). Orders no longer
--  return to inventory.
--
--  Guard `expired_at is null` ensures each row is expired only once
--  (status stays 'submitted', so it would otherwise re-match daily).
--
--  Apply via Supabase SQL editor. Idempotent.
-- ============================================================

create or replace function recycle_expired_submissions()
returns table(id uuid, amazon_order_number text, email text)
language plpgsql as $$
begin
  return query
  update gift_requests
    set unique_token  = gen_gift_token(),   -- expire the old claim link
        expired_at    = now(),
        recycle_count = gift_requests.recycle_count + 1
  where status = 'submitted'
    and email_sent_at is not null
    and email_sent_at < now() - interval '14 days'
    and expired_at is null
  returning gift_requests.id, gift_requests.amazon_order_number, gift_requests.email;
end;
$$;
