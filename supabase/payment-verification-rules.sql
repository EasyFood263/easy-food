-- Easy Food payment verification + next-day grace/restriction rules.
-- Run after schema.sql and production.sql.

alter table public.profiles
  add column if not exists access_status text not null default 'active' check (access_status in ('active','payment_pending','restricted')),
  add column if not exists access_paid_until date;

alter table public.restaurants
  add column if not exists payment_verification_status text not null default 'pending' check (payment_verification_status in ('pending','submitted','verified','rejected')),
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_screenshot_url text,
  add column if not exists payment_transaction_ref text,
  add column if not exists next_day_grace_until timestamptz,
  add column if not exists restricted_at timestamptz;

alter table public.rider_daily_fees
  add column if not exists payment_verification_status text not null default 'pending' check (payment_verification_status in ('pending','submitted','verified','rejected')),
  add column if not exists payment_screenshot_url text,
  add column if not exists transaction_reference text,
  add column if not exists submitted_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists amount numeric(12,2) not null default 50;

-- Restaurant submits a payment for the platform fee/settlement. It never becomes verified merely by submission.
create or replace function public.submit_restaurant_payment(
  p_restaurant uuid,
  p_amount numeric,
  p_transaction_reference text,
  p_screenshot_url text
) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_restaurant_owner(p_restaurant) then raise exception 'Restaurant access required'; end if;
  update public.restaurants
  set payment_verification_status='submitted', payment_submitted_at=now(),
      payment_transaction_ref=p_transaction_reference, payment_screenshot_url=p_screenshot_url,
      next_day_grace_until=(date_trunc('day', now()) + interval '1 day' + interval '4 hours')
  where id=p_restaurant;
end;
$$;

-- Admin verification is the only path to verified status.
create or replace function public.verify_restaurant_payment(p_restaurant uuid, p_approved boolean, p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.restaurants
  set payment_verification_status=case when p_approved then 'verified' else 'rejected' end,
      payment_verified_at=case when p_approved then now() else null end,
      access_status=case when p_approved then 'active' else 'payment_pending' end,
      access_paid_until=case when p_approved then current_date + 1 else null end,
      restricted_at=null
  where id=p_restaurant;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), case when p_approved then 'restaurant_payment_verified' else 'restaurant_payment_rejected' end,
         'restaurant', p_restaurant, jsonb_build_object('reason',p_reason));
end;
$$;

-- At the start of a new day, a restaurant whose payment is still under admin review gets a four-hour grace period.
-- After 04:00 local/server time, it is restricted from receiving new orders. Existing orders remain visible.
create or replace function public.enforce_restaurant_daily_access()
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.restaurants
  set status='restricted'::public.account_status, access_status='restricted', restricted_at=now()
  where payment_verification_status <> 'verified'
    and (next_day_grace_until is null or now() >= next_day_grace_until)
    and coalesce(status::text,'active') <> 'restricted';
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Rider fee submission. Payment is pending until Admin verifies it.
create or replace function public.submit_rider_daily_fee(
  p_amount numeric,
  p_transaction_reference text,
  p_screenshot_url text
) returns uuid language plpgsql security definer set search_path=public as $$
declare fee_id uuid;
begin
  if not public.is_rider() then raise exception 'Active rider access required'; end if;
  insert into public.rider_daily_fees(rider_id, fee_date, amount, payment_verification_status,
      transaction_reference, payment_screenshot_url, submitted_at)
  values(auth.uid(), current_date, 50, 'submitted', p_transaction_reference, p_screenshot_url, now())
  on conflict (rider_id, fee_date) do update set amount=50, payment_verification_status='submitted',
      transaction_reference=excluded.transaction_reference, payment_screenshot_url=excluded.payment_screenshot_url,
      submitted_at=now(), verified_at=null, verified_by=null
  returning id into fee_id;
  return fee_id;
end;
$$;

create or replace function public.verify_rider_daily_fee(p_fee_id uuid, p_approved boolean)
returns void language plpgsql security definer set search_path=public as $$
declare rider uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select rider_id into rider from public.rider_daily_fees where id=p_fee_id;
  update public.rider_daily_fees
  set payment_verification_status=case when p_approved then 'verified' else 'rejected' end,
      verified_at=case when p_approved then now() else null end, verified_by=case when p_approved then auth.uid() else null end
  where id=p_fee_id;
  if p_approved then
    update public.profiles set access_status='active', access_paid_until=current_date where id=rider;
  else
    update public.profiles set access_status='payment_pending' where id=rider;
  end if;
end;
$$;

-- Prevent new orders for a restricted restaurant at database level.
create or replace function public.restaurant_can_receive_orders(p_restaurant uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.restaurants r
    where r.id=p_restaurant and r.status='active'
      and (r.payment_verification_status='verified'
        or r.next_day_grace_until is not null and now() < r.next_day_grace_until));
$$;
