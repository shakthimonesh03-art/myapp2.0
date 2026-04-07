'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveUser, isSessionExpired, logoutUser, markSessionActivity } from '@/lib/clientStore';

export default function NavBar() {
  const router = useRouter();
  const [role, setRole] = useState<string>('guest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncUser = () => {
      const user = getActiveUser();
      setRole(user?.role || 'guest');
      setIsLoggedIn(Boolean(user));
    };
    syncUser();
    const onActivity = () => {
      if (getActiveUser()) markSessionActivity();
    };
    const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, onActivity));
    const expiryWatcher = window.setInterval(() => {
      if (isSessionExpired() && getActiveUser()) {
        logoutUser();
        syncUser();
        router.push('/auth');
      }
    }, 30_000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(expiryWatcher);
    };
  }, [router]);

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
          <Link href="/notifications" aria-label="Notifications" title="Notifications">🔔</Link>
          {role === 'admin' && <Link href="/admin">Admin</Link>}
        </nav>
      </div>
    </header>
  );
}
