import { NextResponse } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bukharaofficial321@gmail.com';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    if (request.headers.get('cookie')?.includes('easyfood_admin_verified=1') !== true) {
      return NextResponse.json({ ok: false, error: 'Admin session is not active.' }, { status: 401 });
    }
    const { currentPassword, newPassword } = await request.json();
    const current = String(currentPassword || '');
    const next = String(newPassword || '');
    if (!ADMIN_EMAIL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: false, error: 'Admin authentication is not configured on the server.' }, { status: 503 });
    }
    if (next.length < 10) return NextResponse.json({ ok: false, error: 'New password must be at least 10 characters.' }, { status: 400 });
    if (current === next) return NextResponse.json({ ok: false, error: 'New password must be different from the current password.' }, { status: 400 });

    const signIn = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: current }),
      cache: 'no-store',
    });
    if (!signIn.ok) return NextResponse.json({ ok: false, error: 'Current password is incorrect.' }, { status: 401 });

    const users = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      cache: 'no-store',
    });
    if (!users.ok) throw new Error('Could not load owner account.');
    const data = await users.json() as { users?: Array<{ id: string; email?: string }> };
    const user = data.users?.find((u) => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!user) return NextResponse.json({ ok: false, error: 'Owner account was not found.' }, { status: 404 });

    const update = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: next, user_metadata: { role: 'admin' } }),
      cache: 'no-store',
    });
    if (!update.ok) throw new Error(`Password update failed (${update.status}).`);

    const response = NextResponse.json({ ok: true, message: 'Password changed successfully.' });
    response.cookies.set('easyfood_admin_verified', '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
    return response;
  } catch (error) {
    console.error('admin password change error', error);
    return NextResponse.json({ ok: false, error: 'Password change service is unavailable.' }, { status: 500 });
  }
}
