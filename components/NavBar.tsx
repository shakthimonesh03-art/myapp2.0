'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getActiveUser } from '@/lib/clientStore';

export default function NavBar() {
  const [role, setRole] = useState<string>('guest');

  useEffect(() => {
    const user = getActiveUser();
    setRole(user?.role || 'guest');
  }, []);

  return (
    <header className="topbar">
      <div className="container nav-shell">
        <Link href="/" className="brand">
          TicketPulse
          <span>Razorpay UPI Ready</span>
        </Link>
        <nav className="navlinks">
          <Link href="/">Events</Link>
          <Link href="/auth">Login</Link>
          <Link href="/bookings">Bookings</Link>
          <Link href="/notifications">Alerts</Link>
          {role === 'admin' && <Link href="/admin">Admin</Link>}
        </nav>
      </div>
    </header>
  );
}
