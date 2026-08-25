-- Easy Food partner onboarding / verification layer.
-- Run after supabase/schema.sql.

alter table public.restaurants
  add column if not exists legal_name text,
  add column if not exists owner_name text,
  add column if not exists owner_cnic_last4 text,
  add column if not exists business_phone text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists bank_name text,
  add column if not exists bank_account_title text,
  add column if not exists bank_account_number text,
  add column if not exists iban text,
  add column if not exists easypaisa_number text,
  add column if not exists jazzcash_number text,
  add column if not exists payment_qr_url text,
  add column if not exists payment_instructions text;

alter table public.riders
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists cnic_last4 text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists emergency_contact text,
  add column if not exists vehicle_type text,
  add column if not exists vehicle_number text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz;

create table if not exists public.restaurant_documents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.rider_documents (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_welcome_messages (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  title text not null,
  body text not null,
  rules jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.partner_welcome_messages(role,title,body,rules) values
('restaurant','Welcome to Easy Food Restaurant Partner','Welcome! Complete and verify your restaurant profile before receiving customer orders.','["Use your real business information.","Add your restaurant location with GPS coordinates.","Upload required business/identity documents.","Add verified bank/EasyPaisa/JazzCash settlement details.","Add menu, food images, prices, categories and opening hours.","Keep customer and payment information private.","Two warnings can result in order-receiving restriction."]'::jsonb),
('rider','Welcome to Easy Food Rider Partner','Welcome! Complete identity verification and daily access payment before receiving deliveries.','["Use your real identity and vehicle information.","Allow location only while on duty/active delivery.","Pay the Rs. 50 daily access fee and submit transaction evidence.","Orders become available only after required verification.","Use delivery OTP and confirm COD collection correctly.","Fraud, false delivery or misuse can lead to suspension."]'::jsonb);

create index if not exists restaurants_city_status_idx on public.restaurants(city_id,status,verification_status);
create index if not exists restaurants_location_idx on public.restaurants(latitude,longitude);
create index if not exists riders_location_online_idx on public.riders(latitude,longitude,online,available_for_orders);

alter table public.restaurant_documents enable row level security;
alter table public.rider_documents enable row level security;
alter table public.partner_welcome_messages enable row level security;

create policy "restaurant own documents" on public.restaurant_documents
for all using (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.owner_id=auth.uid()))
with check (exists(select 1 from public.restaurants r where r.id=restaurant_id and r.owner_id=auth.uid()));
create policy "rider own documents" on public.rider_documents
for all using (rider_id=auth.uid()) with check (rider_id=auth.uid());
create policy "partner welcome public read" on public.partner_welcome_messages
for select using (active=true);

-- Admin approval must be implemented through a trusted server-side/admin route.
-- A restaurant/rider must never become active merely because a browser form was submitted.
