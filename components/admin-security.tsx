'use client';

import { useEffect, useState } from 'react';

const OWNER_EMAIL = 'bukharaofficial321@gmail.com';

type Status = { kind: 'error' | 'ok'; text: string } | null;

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export default function AdminSecurity() {
  const [adminSession, setAdminSession] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onCapture = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;
      const text = (button.textContent || '').trim();
      if (text !== 'Continue securely') return;

      const modal = button.closest('.login');
      if (!modal || !(modal.textContent || '').includes('Admin Control Centre')) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setStatus(null);

      const inputs = Array.from(modal.querySelectorAll('input')) as HTMLInputElement[];
      const emailInput = inputs[0];
      const passwordInput = inputs[1];
      const accessInput = inputs[2];
      const email = (emailInput?.value || OWNER_EMAIL).trim().toLowerCase();
      const password = passwordInput?.value || '';
      const accessCode = accessInput?.value || '';

      if (emailInput && !emailInput.value) setReactInputValue(emailInput, OWNER_EMAIL);
      if (!email || !password) {
        setStatus({ kind: 'error', text: 'Owner email and password are required.' });
        return;
      }

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, accessCode }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          setStatus({ kind: 'error', text: result.error || 'Owner login failed.' });
          return;
        }

        // The existing UI expects the one-time-code field to be non-empty.
        // The server remains the source of truth for whether a code is required.
        if (accessInput && !accessInput.value) setReactInputValue(accessInput, '0000');
        setAdminSession(true);
        setStatus({ kind: 'ok', text: 'Owner verified. Opening the private control centre…' });
        setTimeout(() => {
          button.click();
        }, 0);
      } catch {
        setStatus({ kind: 'error', text: 'Could not reach the secure authentication service.' });
      }
    };

    document.addEventListener('click', onCapture, true);
    return () => document.removeEventListener('click', onCapture, true);
  }, []);

  async function changePassword() {
    setStatus(null);
    if (newPassword.length < 10) return setStatus({ kind: 'error', text: 'New password must be at least 10 characters.' });
    if (newPassword !== confirmPassword) return setStatus({ kind: 'error', text: 'New password and confirmation do not match.' });
    setBusy(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setStatus({ kind: 'error', text: result.error || 'Password could not be changed.' });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangeOpen(false);
      setStatus({ kind: 'ok', text: 'Password changed successfully. Your new password is now active.' });
    } catch {
      setStatus({ kind: 'error', text: 'Could not reach the password service.' });
    } finally {
      setBusy(false);
    }
  }

  return <>
    {adminSession && <button
      type="button"
      onClick={() => { setStatus(null); setChangeOpen(true); }}
      style={{ position: 'fixed', right: 22, top: 88, zIndex: 210, border: '1px solid #dce4ee', background: '#fff', color: '#10213e', borderRadius: 10, padding: '10px 14px', fontWeight: 800, boxShadow: '0 8px 25px #10213e20' }}
    >🔐 Change password</button>}

    {status && <div style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 220, maxWidth: 420, padding: '13px 16px', borderRadius: 11, background: status.kind === 'ok' ? '#0b6b4b' : '#9f234e', color: '#fff', fontSize: 12, boxShadow: '0 12px 35px #0003' }}>
      {status.text}
    </div>}

    {changeOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 230, background: '#061328a6', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div style={{ width: 'min(480px, 94vw)', background: '#fff', borderRadius: 22, padding: 30, boxShadow: '0 25px 80px #0005', position: 'relative' }}>
        <button type="button" onClick={() => setChangeOpen(false)} style={{ position: 'absolute', right: 16, top: 16, border: 0, background: '#f0f4f8', borderRadius: 9, width: 36, height: 36, fontSize: 22 }}>×</button>
        <div style={{ fontSize: 30 }}>🔐</div>
        <div style={{ marginTop: 8, fontSize: 9, letterSpacing: 1.8, fontWeight: 900, color: '#16a9e8' }}>PRIVATE OWNER SECURITY</div>
        <h2 style={{ color: '#0e1d37', margin: '8px 0' }}>Change admin password</h2>
        <p style={{ color: '#7e899c', fontSize: 12, lineHeight: 1.5 }}>Your new password is stored in Supabase Auth. It is not saved in GitHub or browser source code.</p>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginTop: 14 }}>Current password<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #dfe5ec', borderRadius: 10, padding: 12 }} /></label>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginTop: 12 }}>New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #dfe5ec', borderRadius: 10, padding: 12 }} /></label>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginTop: 12 }}>Confirm new password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #dfe5ec', borderRadius: 10, padding: 12 }} /></label>
        <button type="button" disabled={busy} onClick={changePassword} style={{ width: '100%', marginTop: 18, border: 0, borderRadius: 10, padding: 13, background: 'linear-gradient(135deg,#16a9e8,#138bd0)', color: '#fff', fontWeight: 800 }}>{busy ? 'Changing…' : 'Save new password'}</button>
        <button type="button" onClick={() => setChangeOpen(false)} style={{ display: 'block', margin: '12px auto 0', border: 0, background: 'none', color: '#ee5b9b' }}>Cancel</button>
      </div>
    </div>}
  </>;
}
