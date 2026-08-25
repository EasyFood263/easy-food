-- Easy Food production hardening migration.
-- Run this AFTER supabase/schema.sql in the Supabase SQL editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

create or replace function public.is_restaurant_owner(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.restaurants where id = p_restaurant and owner_id = auth.uid());
$$;

create or replace function public.is_rider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'rider' and status = 'active');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, phone, email, role, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'Easy Food User'), '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.email,
    case when (new.raw_user_meta_data->>'role') in ('customer','restaurant','rider') then (new.raw_user_meta_data->>'role')::public.app_role else 'customer'::public.app_role end,
    case when new.raw_user_meta_data->>'language' = 'ur' then 'ur' else 'en' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists restaurants_updated_at on public.restaurants;
create trigger restaurants_updated_at before update on public.restaurants for each row execute procedure public.set_updated_at();
drop trigger if exists menu_items_updated_at on public.menu_items;
create trigger menu_items_updated_at before update on public.menu_items for each row execute procedure public.set_updated_at();

-- Orders: customers create their own orders; restaurants/riders/admins can operate only on relevant orders.
drop policy if exists customer create orders on public.orders;
create policy "customer create orders" on public.orders
for insert with check (auth.uid() = customer_id and exists (select 1 from public.addresses a where a.id = address_id and a.customer_id = auth.uid()));

drop policy if exists customer update orders on public.orders;
create policy "customer update orders" on public.orders
for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists restaurant read orders on public.orders;
create policy "restaurant read orders" on public.orders
for select using (public.is_restaurant_owner(restaurant_id));

drop policy if exists restaurant update orders on public.orders;
create policy "restaurant update orders" on public.orders
for update using (public.is_restaurant_owner(restaurant_id)) with check (public.is_restaurant_owner(restaurant_id));

drop policy if exists rider read assigned orders on public.orders;
create policy "rider read assigned orders" on public.orders
for select using (public.is_rider() and rider_id = auth.uid());

drop policy if exists rider update assigned orders on public.orders;
create policy "rider update assigned orders" on public.orders
for update using (public.is_rider() and rider_id = auth.uid()) with check (public.is_rider() and rider_id = auth.uid());

drop policy if exists admin all orders on public.orders;
create policy "admin all orders" on public.orders
for all using (public.is_admin()) with check (public.is_admin());

-- Order items follow their parent order permissions.
drop policy if exists customer insert order items on public.order_items;
create policy "customer insert order items" on public.order_items
for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
drop policy if exists restaurant read order items on public.order_items;
create policy "restaurant read order items" on public.order_items
for select using (exists (select 1 from public.orders o where o.id = order_id and public.is_restaurant_owner(o.restaurant_id)));
drop policy if exists rider read order items on public.order_items;
create policy "rider read order items" on public.order_items
for select using (exists (select 1 from public.orders o where o.id = order_id and o.rider_id = auth.uid()));
drop policy if exists admin all order items on public.order_items;
create policy "admin all order items" on public.order_items
for all using (public.is_admin()) with check (public.is_admin());

-- Restaurants can manage their own categories/menu. Admin has full control.
drop policy if exists restaurant owner categories on public.categories;
create policy "restaurant owner categories" on public.categories
for all using (public.is_restaurant_owner(restaurant_id)) with check (public.is_restaurant_owner(restaurant_id));
drop policy if exists admin all categories on public.categories;
create policy "admin all categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin all menu items on public.menu_items;
create policy "admin all menu items" on public.menu_items
for all using (public.is_admin()) with check (public.is_admin());

-- Rider profile/location and fee records.
drop policy if exists rider own profile on public.riders;
create policy "rider own profile" on public.riders
for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists admin all riders on public.riders;
create policy "admin all riders" on public.riders
for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists rider own fees on public.rider_daily_fees;
create policy "rider own fees" on public.rider_daily_fees
for select using (rider_id = auth.uid());
drop policy if exists admin all rider fees on public.rider_daily_fees;
create policy "admin all rider fees" on public.rider_daily_fees
for all using (public.is_admin()) with check (public.is_admin());

-- Reviews, complaints, payments and settlements.
drop policy if exists customer create reviews on public.reviews;
create policy "customer create reviews" on public.reviews
for insert with check (auth.uid() = customer_id and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'delivered'));
drop policy if exists admin all reviews on public.reviews;
create policy "admin all reviews" on public.reviews
for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists customer create complaints on public.complaints;
create policy "customer create complaints" on public.complaints
for insert with check (auth.uid() = reporter_id);
drop policy if exists customer read complaints on public.complaints;
create policy "customer read complaints" on public.complaints
for select using (auth.uid() = reporter_id);
drop policy if exists admin all complaints on public.complaints;
create policy "admin all complaints" on public.complaints
for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin all payments on public.payments;
create policy "admin all payments" on public.payments
for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin all settlements on public.settlements;
create policy "admin all settlements" on public.settlements
for all using (public.is_admin()) with check (public.is_admin());

-- Public configuration is readable; only admin can change it.
drop policy if exists public read settings on public.app_settings;
create policy "public read settings" on public.app_settings for select using (true);
drop policy if exists admin write settings on public.app_settings;
create policy "admin write settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- Notification access: users see their own messages, admins can create broadcasts.
drop policy if exists admin create notifications on public.notifications;
create policy "admin create notifications" on public.notifications
for insert with check (public.is_admin());
drop policy if exists recipient update notifications on public.notifications;
create policy "recipient update notifications" on public.notifications
for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
drop policy if exists admin all notifications on public.notifications;
create policy "admin all notifications" on public.notifications
for all using (public.is_admin()) with check (public.is_admin());

-- Automatic in-app notifications whenever an order is placed or changes status.
create or replace function public.notify_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_owner uuid;
  rider_profile uuid;
begin
  select owner_id into restaurant_owner from public.restaurants where id = new.restaurant_id;
  if tg_op = 'INSERT' then
    insert into public.notifications(recipient_id, title, body, type)
    values (new.customer_id, 'Order placed', 'Your Easy Food order ' || new.order_number || ' has been placed.', 'order');
    if restaurant_owner is not null then
      insert into public.notifications(recipient_id, title, body, type)
      values (restaurant_owner, 'New order', 'New order ' || new.order_number || ' received.', 'order');
    end if;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.notifications(recipient_id, title, body, type)
    values (new.customer_id, 'Order update', 'Order ' || new.order_number || ' is now ' || replace(new.status::text, '_', ' ') || '.', 'order');
    if restaurant_owner is not null then
      insert into public.notifications(recipient_id, title, body, type)
      values (restaurant_owner, 'Order update', 'Order ' || new.order_number || ' is now ' || replace(new.status::text, '_', ' ') || '.', 'order');
    end if;
    rider_profile := new.rider_id;
    if rider_profile is not null then
      insert into public.notifications(recipient_id, title, body, type)
      values (rider_profile, 'Delivery update', 'Order ' || new.order_number || ' is now ' || replace(new.status::text, '_', ' ') || '.', 'order');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists order_notifications_after_insert on public.orders;
create trigger order_notifications_after_insert after insert on public.orders for each row execute procedure public.notify_order_change();
drop trigger if exists order_notifications_after_status on public.orders;
create trigger order_notifications_after_status after update of status on public.orders for each row execute procedure public.notify_order_change();

-- Business rule: restaurant gets two warnings; the second warning restricts the account.
create or replace function public.apply_restaurant_warning(p_restaurant uuid, p_reason text)
returns public.restaurants
language plpgsql
security definer
set search_path = public
as $$
declare r public.restaurants;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.restaurants
  set warning_count = warning_count + 1,
      status = case when warning_count + 1 >= 2 then 'restricted'::public.account_status else 'warning'::public.account_status end,
      updated_at = now()
  where id = p_restaurant
  returning * into r;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'restaurant_warning', 'restaurant', p_restaurant, jsonb_build_object('reason', p_reason, 'warning_count', r.warning_count, 'status', r.status));
  return r;
end;
$$;

-- Daily settlement calculation for restaurants and riders. Call this once per day from a trusted scheduler.
create or replace function public.create_daily_settlements(p_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  row_record record;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  for row_record in
    select restaurant_id,
           coalesce(sum(total_amount),0) gross,
           coalesce(sum(restaurant_commission),0) commission,
           coalesce(sum(case when payment_method='cod' then cod_outstanding else 0 end),0) cod
    from public.orders
    where placed_at::date = p_date and status = 'delivered'
    group by restaurant_id
  loop
    insert into public.settlements(restaurant_id, settlement_date, gross_amount, commission_amount, cod_amount, net_amount, status)
    values (row_record.restaurant_id, p_date, row_record.gross, row_record.commission, row_record.cod, row_record.gross - row_record.commission, 'pending');
    inserted_count := inserted_count + 1;
  end loop;
  return inserted_count;
end;
$$;

-- Enable realtime for the feeds used by the web/mobile clients. Ignore duplicate publication errors when re-running.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.riders;
