'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveUser, logoutUser } from '@/lib/clientStore';

export default function NavBar() {
  const router = useRouter();
  const [role, setRole] = useState<string>('guest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = getActiveUser();
    setRole(user?.role || 'guest');
    setIsLoggedIn(Boolean(user));
  }, []);

  const onLogout = () => {
    logoutUser();
    setRole('guest');
    setIsLoggedIn(false);
    router.push('/auth');
  };

  return (
    <header className="topbar">
      <div className="container nav-shell">
        <Link href="/" className="brand">
          TicketPulse
          <span>Razorpay UPI Ready</span>
        </Link>
        <nav className="navlinks">
          <Link href="/">Events</Link>
          {!isLoggedIn ? <Link href="/auth">Login</Link> : <button className="btn ghost" onClick={onLogout}>Logout</button>}
          <Link href="/bookings">Bookings</Link>
          <Link href="/notifications">Alerts</Link>
          {role === 'admin' && <Link href="/admin">Admin</Link>}
        </nav>
      </div>
    </header>
  );
}
