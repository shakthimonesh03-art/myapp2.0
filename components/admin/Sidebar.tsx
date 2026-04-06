'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Admin Dashboard' },
  { href: '/admin/pages', label: 'Admin Pages' },
  { href: '/admin/venues', label: 'Venue Management' },
  { href: '/admin/events', label: 'Event Creation & Management' },
  { href: '/admin/pricing', label: 'Pricing Configuration' },
  { href: '/admin/bookings', label: 'Booking List Management' },
  { href: '/admin/refunds', label: 'Refund Panel' },
  { href: '/admin/reports', label: 'Reports Dashboard' }
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <h2>Admin Pages</h2>
      <nav>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={`admin-nav-item ${pathname === item.href ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
