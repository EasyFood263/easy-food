import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'easy-food-web',
    timestamp: new Date().toISOString(),
    integrations: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      payments: Boolean(process.env.EASYFOOD_PAYMENT_PROVIDER),
      notifications: Boolean(process.env.EASYFOOD_NOTIFICATION_PROVIDER),
    },
  });
}
