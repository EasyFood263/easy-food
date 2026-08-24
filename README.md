# Easy Food

Pakistan-wide food ordering & delivery marketplace.

## Roles
- Customer
- Restaurant
- Rider
- Admin

## Platforms
- Android + iPhone mobile app foundation (Expo/React Native)
- Web foundation (Next.js)
- Supabase/PostgreSQL database foundation

## Business rules
- Restaurant commission: 2.5% per order
- Rider daily entry fee: Rs. 50
- Delivery: up to 4 KM = 4%; above 4 KM = 8%
- Platform charge: Rs. 1–3,000 = 3%; Rs. 3,001+ = 6%
- COD settlement: daily
- Restaurant: 2 warnings, then restriction
- Default language: English; Urdu available
- Theme: light blue + pink

## Development status
Initial repository foundation. Production authentication, payment verification, realtime tracking, notifications, settlements, and complete role workflows are the next implementation phases.

Never commit payment/API secrets. Use deployment environment secrets.
