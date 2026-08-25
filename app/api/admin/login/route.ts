import { NextResponse } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || '';
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function supabaseAdmin(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server credentials are not configured.');
  return fetch(`${SUPABASE_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function POST(request: Request) {
  try {
    const { email, password, accessCode } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!ADMIN_EMAIL || !ADMIN_INITIAL_PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Admin credentials are not configured on the server.' }, { status: 503 });
    }
    if (normalizedEmail !== ADMIN_EMAIL.trim().toLowerCase() || String(password || '') !== ADMIN_INITIAL_PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Invalid owner email or password.' }, { status: 401 });
    }
    if (ADMIN_ACCESS_CODE && String(accessCode || '') !== ADMIN_ACCESS_CODE) {
      return NextResponse.json({ ok: false, error: 'Invalid one-time access code.' }, { status: 401 });
    }

    // Ensure the owner exists in Supabase Auth. The service-role key is never sent to the browser.
    const usersResponse = await supabaseAdmin(`/auth/v1/admin/users?per_page=1000`);
    if (!usersResponse.ok) throw new Error(`Supabase user lookup failed (${usersResponse.status}).`);
    const users = await usersResponse.json() as { users?: Array<{ id: string; email?: string }> };
    let user = users.users?.find((u) => (u.email || '').toLowerCase() === normalizedEmail);

    if (!user) {
      const createResponse = await supabaseAdmin('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password: ADMIN_INITIAL_PASSWORD, email_confirm: true, user_metadata: { role: 'admin' } }),
      });
      if (!createResponse.ok) throw new Error(`Supabase owner creation failed (${createResponse.status}).`);
      user = await createResponse.json();
    }

    // On the first login only, synchronize the configured temporary password.
    // Subsequent logins are handled by the password stored in Supabase Auth.
    const tokenResponse = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password: ADMIN_INITIAL_PASSWORD }),
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      // If the existing Auth account has an old password, reset it to the configured temporary password.
      const updateResponse = await supabaseAdmin(`/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password: ADMIN_INITIAL_PASSWORD, user_metadata: { role: 'admin' } }),
      });
      if (!updateResponse.ok) throw new Error(`Supabase owner password synchronization failed (${updateResponse.status}).`);
      const retry = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: ADMIN_INITIAL_PASSWORD }),
        cache: 'no-store',
      });
      if (!retry.ok) return NextResponse.json({ ok: false, error: 'Owner authentication failed.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('easyfood_admin_verified', '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
    return response;
  } catch (error) {
    console.error('admin login error', error);
    return NextResponse.json({ ok: false, error: 'Admin authentication service is unavailable.' }, { status: 500 });
  }
}
