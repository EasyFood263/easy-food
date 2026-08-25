# Easy Food

Pakistan-wide food ordering & delivery marketplace for **web + Android + iPhone**.

## Roles
- Customer
- Restaurant
- Independent Rider
- Admin / Owner

## Product rules
- Restaurant commission: **2.5% per order**
- Rider daily entry fee: **Rs. 50/day**
- Delivery charge: **up to 4 KM = 4%; above 4 KM = 8%** of the order subtotal
- Platform charge: **Rs. 1–3,000 = 3%; Rs. 3,001+ = 6%**
- COD settlement: **Daily**
- Restaurant enforcement: **2 warnings, then restriction**
- Ratings: **1–5 stars** for restaurant and rider
- Default language: **English** with **Urdu** switch
- Theme: **light blue + pink**
- Notifications: in-app order notifications to customer, restaurant and assigned rider
- Delivery OTP: generated per order
- Rider access: independent riders can use the rider workspace after authentication and daily access payment

## Repository structure
- `app/` — Next.js web application
- `apps/mobile/` — Expo Router mobile application
- `supabase/schema.sql` — base database schema
- `supabase/production.sql` — production RLS, auth profile trigger, automatic notifications, warning/restriction logic and daily settlement function
- `app/api/orders/route.ts` — server-side order calculation and creation
- `app/api/health/route.ts` — deployment health check
- `lib/supabase-browser.ts` — optional browser Supabase client

## Supabase setup
1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/production.sql` after it.
3. Configure Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Never expose a Supabase service-role key in browser code.

## Payment / notification providers
The app keeps payment credentials server-side. Easypaisa/JazzCash merchant credentials, callback URLs and provider-specific API settings must be supplied as Vercel/Supabase secrets before real-money online payment can be activated. The UI and database support COD and online-payment states without hard-coding private credentials.

## Development
```bash
npm install
npm run build
npm run start
```

Mobile:
```bash
cd apps/mobile
npm install
npx expo start
```

## Production status
The current repository contains the complete marketplace UI foundation, mobile role foundation, business-rule calculation, Supabase schema, production RLS/auth/notification/settlement layer and server-side order API. Provider credentials and Supabase SQL migration must be applied to activate live production services.

Never commit payment/API secrets.
