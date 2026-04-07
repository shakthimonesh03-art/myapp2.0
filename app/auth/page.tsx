'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppUser, getActiveUser, loginUser, logoutUser, requestOtp, registerUser } from '@/lib/clientStore';

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [role] = useState<'customer' | 'admin'>('customer');
  const [message, setMessage] = useState('');
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const user = getActiveUser();
    setActiveUser(user);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || !otp.trim()) {
      setMessage('Email and OTP are required.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setMessage('Name is required.');
        return;
      }
      const result = registerUser(name, email, otp, role);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage('Signup successful. Redirecting...');
      router.push('/');
      return;
    }

    const result = loginUser(email, otp);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('Login successful. Redirecting...');
    router.push('/');
  };

  const sendOtp = () => {
    const response = requestOtp(email);
    if (!response.ok) {
      setMessage(response.error || 'Unable to send OTP.');
      return;
    }
    setMessage(`OTP sent to ${email.trim().toLowerCase()} (demo code: ${response.otpCode})`);
  };

  const onLogout = () => {
    logoutUser();
    setActiveUser(null);
    setMessage('Logged out successfully.');
  };

  return (
    <section className="card stack auth-card">
      <h1>{mode === 'signup' ? 'Create account' : 'Login'}</h1>
      <p>Gmail-only authentication with OTP verification. Existing non-Gmail demo users are removed.</p>

      {activeUser ? (
        <div className="card stack">
          <p>Active user: {activeUser.name} ({activeUser.email})</p>
          <button className="btn ghost" onClick={onLogout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={submit} className="stack">
          {mode === 'signup' && (
            <>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </>
          )}
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />
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
