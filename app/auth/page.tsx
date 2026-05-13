'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getActiveUser,
  isEmailRegistered,
  loginUser,
  logoutUser,
  registerUser,
  updateUserPassword,
  type AppUser
} from '@/lib/clientStore';

type AuthAction = 'send-signup-otp' | 'verify-signup-otp' | 'forgot-password' | 'reset-password';
type AuthApiResponse = { message?: string; error?: string; verified?: boolean; reset?: boolean };

async function callAuthApi(action: AuthAction, payload: Record<string, string>) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });

  let data: AuthApiResponse = {};
  try {
    data = (await response.json()) as AuthApiResponse;
  } catch {
    data = {};
  }

  return { ok: response.ok, data };
}

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [message, setMessage] = useState('');
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  useEffect(() => {
    setActiveUser(getActiveUser());
  }, []);

  const resetSignupFlow = () => {
    setOtp('');
    setOtpSent(false);
  };

  const sendOtp = async () => {
    setBusy(true);
    const { ok, data } = await callAuthApi('send-signup-otp', { email });
    setBusy(false);
    if (!ok) {
      setMessage(data.error || 'Unable to send OTP right now. Please try again.');
      return false;
    }
    setOtpSent(true);
    setMessage(data.message || 'OTP sent to your email address.');
    return true;
  };

  const requestPasswordReset = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage('Email is required to send a password reset mail.');
      return;
    }
    if (!isEmailRegistered(cleanEmail)) {
      setMessage('User not found. Please sign up first.');
      return;
    }

    setBusy(true);
    const { ok, data } = await callAuthApi('forgot-password', { email: cleanEmail });
    setBusy(false);

    if (!ok) {
      setMessage(data.error || 'Unable to send password reset mail right now.');
      return;
    }

    setResetEmail(cleanEmail);
    setMessage(data.message || 'Password reset OTP sent. Please check your Gmail inbox.');
  };

  const completePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setMessage('Please request a reset OTP first.');
      return;
    }
    if (!resetOtp.trim()) {
      setMessage('Enter the reset OTP.');
      return;
    }
    if (!resetPassword.trim()) {
      setMessage('Enter a new password.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setMessage('New password and confirm password must match.');
      return;
    }

    setBusy(true);
    const { ok, data } = await callAuthApi('reset-password', {
      email: resetEmail,
      otp: resetOtp.trim(),
      newPassword: resetPassword
    });
    setBusy(false);

    if (!ok || !data.reset) {
      setMessage(data.error || 'Unable to reset password right now.');
      return;
    }

    const localUpdate = updateUserPassword(resetEmail, resetPassword);
    if (localUpdate.error) {
      setMessage(`${data.message || 'Password reset verified.'} Please sign up/login again in this browser.`);
      return;
    }

    setResetOtp('');
    setResetPassword('');
    setResetConfirmPassword('');
    setMessage(data.message || 'Password reset successful. Login with your new password.');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setMessage('Email and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setMessage('Name is required.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Password and confirm password must match.');
        return;
      }
      if (isEmailRegistered(email)) {
        setMessage('Email already registered. Please login.');
        return;
      }

      if (!otpSent) {
        await sendOtp();
        return;
      }

      if (!otp.trim()) {
        setMessage('Enter the OTP sent to your email.');
        return;
      }

      setBusy(true);
      const verify = await callAuthApi('verify-signup-otp', { email, otp });
      setBusy(false);

      if (!verify.ok || !verify.data.verified) {
        setMessage(verify.data.error || 'Invalid OTP. Please try again.');
        return;
      }

      const result = registerUser(name, email, password, 'customer');
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage('Signup successful. Redirecting...');
      router.push('/');
      return;
    }

    const result = loginUser(email, password);
    if (result.error) {
      setMessage(result.error);
      return;
    }

    setActiveUser(result.user || null);
    setMessage('Login successful.');
  };

  const onLogout = () => {
    logoutUser();
    setActiveUser(null);
    setMessage('Logged out successfully.');
  };

  const toggleMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setMessage('');
    setConfirmPassword('');
    resetSignupFlow();
  };

  const resendOtp = async () => {
    if (busy) return;
    setMessage('');
    setOtp('');
    await sendOtp();
  };

  const signupLocked = mode === 'signup' && otpSent;

  return (
    <section className="card stack auth-card">
      {activeUser ? (
        <>
          <h1>Account</h1>
          <p>Logged in as {activeUser.name} ({activeUser.email})</p>
          <p>Password reset works with Gmail OTP.</p>
          {message && <p>{message}</p>}
          <button className="btn" type="button" onClick={() => requestPasswordReset(activeUser.email)} disabled={busy}>
            Send password reset mail
          </button>
          {resetEmail && (
            <div className="stack">
              <input className="input" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} placeholder="Enter reset OTP" />
              <input className="input" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" />
              <input className="input" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              <button className="btn" type="button" onClick={completePasswordReset} disabled={busy}>Reset Password</button>
            </div>
          )}
          <button className="btn ghost" type="button" onClick={onLogout}>Logout</button>
        </>
      ) : (
        <>
          <h1>{mode === 'signup' ? 'Create account' : 'Login'}</h1>
          <p>Signup uses username, email, password, confirm password, and OTP email verification. Admin demo: admin@ticketpulse.app / admin123</p>

          <form onSubmit={submit} className="stack">
            {mode === 'signup' && (
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" disabled={signupLocked} />
            )}
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Official email address" type="email" disabled={signupLocked} />
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" disabled={signupLocked} />
            {mode === 'signup' && (
              <input className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" disabled={signupLocked} />
            )}
            {mode === 'signup' && otpSent && (
              <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP from email" inputMode="numeric" />
            )}
            {message && <p>{message}</p>}
            <button className="btn" type="submit" disabled={busy}>
              {mode === 'signup' ? (otpSent ? (busy ? 'Verifying OTP...' : 'Verify OTP & Sign up') : (busy ? 'Sending OTP...' : 'Send OTP')) : (busy ? 'Logging in...' : 'Login')}
            </button>
            {mode === 'signup' && otpSent && (
              <button className="btn ghost" type="button" onClick={resendOtp} disabled={busy}>Resend OTP</button>
            )}
            {mode === 'login' && (
              <button className="btn ghost" type="button" onClick={() => requestPasswordReset(email)} disabled={busy}>
                Forgot password? Send reset mail
              </button>
            )}
          </form>

          {mode === 'login' && resetEmail && (
            <div className="stack">
              <input className="input" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} placeholder="Enter reset OTP" />
              <input className="input" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" />
              <input className="input" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              <button className="btn" type="button" onClick={completePasswordReset} disabled={busy}>Reset Password</button>
            </div>
          )}

          <button className="btn ghost" onClick={toggleMode}>
            Switch to {mode === 'signup' ? 'Login' : 'Signup'}
          </button>
        </>
      )}
    </section>
  );
}
