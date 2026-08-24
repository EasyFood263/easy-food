create extension if not exists "pgcrypto";

create type public.app_role as enum ('customer','restaurant','rider','admin');
create type public.order_status as enum ('pending','accepted','preparing','ready','assigned','picked_up','arriving','delivered','cancelled','rejected');
create type public.payment_method as enum ('cod','online');
create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.account_status as enum ('active','warning','restricted','suspended','pending');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  role public.app_role not null default 'customer',
  avatar_url text,
  language text not null default 'en' check (language in ('en','ur')),
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (id uuid primary key default gen_random_uuid(), name text not null, province text, active boolean not null default true, created_at timestamptz not null default now());
create table public.areas (id uuid primary key default gen_random_uuid(), city_id uuid not null references public.cities(id) on delete cascade, name text not null, active boolean not null default true, created_at timestamptz not null default now());

create table public.restaurants (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete restrict,
  city_id uuid references public.cities(id), area_id uuid references public.areas(id), name text not null, description text,
  logo_url text, cover_url text, phone text, address text, latitude double precision, longitude double precision,
  opening_time time, closing_time time, is_open boolean not null default false,
  status public.account_status not null default 'pending', warning_count integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.categories (id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade, name text not null, sort_order integer not null default 0, created_at timestamptz not null default now());
create table public.menu_items (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, name text not null, description text, image_url text,
  price numeric(12,2) not null check (price >= 0), available boolean not null default true,
  offer_percent numeric(5,2) not null default 0 check (offer_percent between 0 and 100), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.profiles(id) on delete cascade,
  label text, address_line text not null, city text, area text, latitude double precision, longitude double precision,
  is_default boolean not null default false, created_at timestamptz not null default now()
);

create table public.riders (
  id uuid primary key references public.profiles(id) on delete cascade, identity_status text not null default 'pending',
  document_url text, online boolean not null default false, available_for_orders boolean not null default false,
  latitude double precision, longitude double precision, last_location_at timestamptz, daily_fee_paid_on date,
  rating numeric(3,2) not null default 5.0, total_deliveries integer not null default 0, earnings numeric(12,2) not null default 0
);

create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text unique not null,
  customer_id uuid not null references public.profiles(id), restaurant_id uuid not null references public.restaurants(id), rider_id uuid references public.riders(id), address_id uuid not null references public.addresses(id),
  status public.order_status not null default 'pending', payment_method public.payment_method not null, payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0, platform_charge numeric(12,2) not null default 0, restaurant_commission numeric(12,2) not null default 0,
  delivery_rate numeric(5,2) not null default 0, delivery_charge numeric(12,2) not null default 0, tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0, distance_km numeric(8,2), cod_outstanding numeric(12,2) not null default 0,
  delivery_otp_hash text, placed_at timestamptz not null default now(), delivered_at timestamptz
);

create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, menu_item_id uuid references public.menu_items(id), item_name text not null, unit_price numeric(12,2) not null, quantity integer not null check (quantity > 0), line_total numeric(12,2) not null);
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, provider text, provider_transaction_id text, amount numeric(12,2) not null, status public.payment_status not null default 'pending', verified_at timestamptz, created_at timestamptz not null default now());
create table public.rider_daily_fees (id uuid primary key default gen_random_uuid(), rider_id uuid not null references public.riders(id) on delete cascade, fee_amount numeric(12,2) not null default 50, fee_date date not null default current_date, payment_id uuid references public.payments(id), status public.payment_status not null default 'pending', unique(rider_id, fee_date));
create table public.settlements (id uuid primary key default gen_random_uuid(), restaurant_id uuid references public.restaurants(id), rider_id uuid references public.riders(id), settlement_date date not null default current_date, gross_amount numeric(12,2) not null default 0, commission_amount numeric(12,2) not null default 0, cod_amount numeric(12,2) not null default 0, net_amount numeric(12,2) not null default 0, status text not null default 'pending', created_at timestamptz not null default now());
create table public.reviews (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, customer_id uuid not null references public.profiles(id), restaurant_id uuid references public.restaurants(id), rider_id uuid references public.riders(id), restaurant_rating integer check (restaurant_rating between 1 and 5), rider_rating integer check (rider_rating between 1 and 5), comment text, created_at timestamptz not null default now());
create table public.complaints (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id), reporter_id uuid not null references public.profiles(id), subject text not null, description text not null, status text not null default 'open', resolution text, created_at timestamptz not null default now(), resolved_at timestamptz);
create table public.notifications (id uuid primary key default gen_random_uuid(), recipient_id uuid references public.profiles(id) on delete cascade, audience public.app_role, title text not null, body text not null, type text not null default 'general', read_at timestamptz, created_at timestamptz not null default now());
create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table public.app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());

insert into public.app_settings(key,value) values
('restaurant_commission','{"percent":2.5}'),
('rider_daily_fee','{"amount":50}'),
('delivery_rules','{"up_to_4km_percent":4,"above_4km_percent":8}'),
('platform_rules','{"up_to_3000_percent":3,"above_3000_percent":6}'),
('support','{"phone":"03702283429","email":"bukharaofficial321@gmail.com"}')
on conflict (key) do update set value=excluded.value;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.addresses enable row level security;
alter table public.riders enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.rider_daily_fees enable row level security;
alter table public.settlements enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cities enable row level security;
alter table public.areas enable row level security;
alter table public.app_settings enable row level security;

create policy "profiles own read" on public.profiles for select using (auth.uid()=id);
create policy "profiles own update" on public.profiles for update using (auth.uid()=id);
create policy "active restaurants public read" on public.restaurants for select using (status='active');
create policy "restaurant owner read" on public.restaurants for select using (auth.uid()=owner_id);
create policy "restaurant owner update" on public.restaurants for update using (auth.uid()=owner_id);
create policy "menu public read" on public.menu_items for select using (available=true);
create policy "menu owner manage" on public.menu_items for all using (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.owner_id=auth.uid()));
create policy "customer addresses" on public.addresses for all using (auth.uid()=customer_id);
create policy "customer own orders" on public.orders for select using (auth.uid()=customer_id);
create policy "customer order items" on public.order_items for select using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "customer notifications" on public.notifications for select using (auth.uid()=recipient_id);
create policy "customer reviews" on public.reviews for all using (auth.uid()=customer_id);

-- Server-side functions/API routes will handle admin, restaurant-order, rider-active-order, payment webhook and settlement permissions.
-- Never expose Supabase service-role credentials to clients.
