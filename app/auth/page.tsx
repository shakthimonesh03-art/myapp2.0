'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '@/lib/clientStore';

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!name.trim() || !email.trim()) {
        setError('Name and email are required');
        return;
      }
      registerUser(name, email);
      router.push('/');
      return;
    }

    const user = loginUser(email);
    if (!user) {
      setError('User not found. Please sign up first.');
      return;
    }
    router.push('/');
  };

  return (
    <section className="card stack auth-card">
      <h1>{mode === 'signup' ? 'Create account' : 'Login'}</h1>
      <p className="muted">Prototype auth for signup/login flow demonstration.</p>
      <form onSubmit={submit} className="stack">
        {mode === 'signup' && (
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        )}
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />
        {error && <p className="danger">{error}</p>}
        <button className="btn" type="submit">{mode === 'signup' ? 'Sign up' : 'Login'}</button>
      </form>
      <button className="btn ghost" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
        Switch to {mode === 'signup' ? 'Login' : 'Signup'}
      </button>
    </section>
  );
}
