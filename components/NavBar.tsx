'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getActiveUser } from '@/lib/clientStore';

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string>('guest');

  useEffect(() => {
    const syncUser = () => {
      const user = getActiveUser();
      setIsLoggedIn(Boolean(user));
      setRole(user?.role || 'guest');
    };

    syncUser();
    const interval = setInterval(syncUser, 1000);
    window.addEventListener('focus', syncUser);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncUser);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="container nav-shell">
        <Link href="/" className="brand">
          TicketPulse
        </Link>
        <nav className="navlinks">
          {role !== 'admin' && <Link href="/">Events</Link>}
          {role !== 'admin' && <Link href="/bookings">Bookings</Link>}
          <Link href="/auth">{isLoggedIn ? 'Account' : 'Login'}</Link>
          {role === 'admin' && <Link href="/admin">Admin Dashboard</Link>}
        </nav>
      </div>
    </header>
  );
}
