'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppUser, getActiveUser, logoutUser, setActiveUser as persistActiveUser } from '@/lib/clientStore';

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [message, setMessage] = useState('');
  const [activeUser, setActiveUserState] = useState<AppUser | null>(null);

  useEffect(() => {
    const user = getActiveUser();
    setActiveUserState(user);
  }, []);

  const parseResponseData = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: text || 'Server returned invalid response.' };
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!phone.trim() || !otp.trim()) {
      setMessage('Phone number and OTP are required.');
      return;
    }
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: mode, name, email, phone, otp })
    });
    const data = await parseResponseData(response);
    if (!response.ok) return setMessage((data.error as string) || 'Authentication failed.');
    persistActiveUser(data.user as AppUser);
    setMessage(`${mode === 'signup' ? 'Signup' : 'Login'} successful. Redirecting...`);
    router.push('/');
  };

  const sendOtp = async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request-otp', phone })
    });
    const data = await parseResponseData(response);
    if (!response.ok) return setMessage((data.error as string) || 'Unable to send OTP.');
    setMessage(data.otpCode ? `${String(data.message || 'OTP generated')} (dev OTP: ${String(data.otpCode)})` : String(data.message || 'OTP generated'));
  };

  const updateProfile = async () => {
    if (!activeUser) return;
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUser.id, name, email })
    });
    const data = await parseResponseData(response);
    if (!response.ok) return setMessage((data.error as string) || 'Profile update failed.');
    persistActiveUser(data.user as AppUser);
    setActiveUserState(data.user as AppUser);
    setMessage('Profile updated. You can change name and email here after sign-in.');
  };

  const adminDemoLogin = async () => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin-demo-login' })
    });
    const data = await parseResponseData(response);
    if (!response.ok) return setMessage((data.error as string) || 'Admin login failed.');
    persistActiveUser(data.user as AppUser);
    setActiveUserState(data.user as AppUser);
    setMessage('Admin demo login successful.');
    router.push('/admin');
  };

  const onLogout = () => {
    logoutUser();
    setActiveUserState(null);
    setMessage('Logged out successfully.');
  };

  return (
    <section className="card stack auth-card">
      <h1>{mode === 'signup' ? 'Create account' : 'Login'}</h1>
      <p>Phone number OTP login. New users can update profile/login details after first sign-in.</p>
      <button className="btn ghost" type="button" onClick={adminDemoLogin}>Use Admin Demo Login</button>

      {activeUser ? (
        <div className="card stack">
          <p>Active user: {activeUser.name} ({activeUser.phone || 'No phone'})</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Update name" />
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Update email" />
          <button className="btn" type="button" onClick={updateProfile}>Update profile</button>
          <button className="btn ghost" onClick={onLogout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={submit} className="stack" action="#">
          {mode === 'signup' && (
            <>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
            </>
          )}
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (+91xxxxxxxxxx)" />
          <div className="row gap-sm wrap">
            <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" />
            <button className="btn ghost" type="button" onClick={sendOtp}>Send OTP</button>
          </div>
          {message && <p>{message}</p>}
          <button className="btn" type="submit">{mode === 'signup' ? 'Sign up' : 'Login'}</button>
        </form>
      )}

      {!activeUser && (
        <button className="btn ghost" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
          Switch to {mode === 'signup' ? 'Login' : 'Signup'}
        </button>
      )}
    </section>
  );
}
