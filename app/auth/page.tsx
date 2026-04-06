'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppUser, getActiveUser, loginUser, logoutUser, registerUser } from '@/lib/clientStore';

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [message, setMessage] = useState('');
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const user = getActiveUser();
    setActiveUser(user);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
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
      const result = registerUser(name, email, password, role);
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
    setMessage('Login successful. Redirecting...');
    router.push('/');
  };

  const onLogout = () => {
    logoutUser();
    setActiveUser(null);
    setMessage('Logged out successfully.');
  };

  return (
    <section className="card stack auth-card">
      <h1>{mode === 'signup' ? 'Create account' : 'Login'}</h1>
      <p>Prototype auth with local persistence. Admin demo: admin@ticketpulse.app / admin123</p>

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
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'customer' | 'admin')}>
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </>
          )}
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
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
