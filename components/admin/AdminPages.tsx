'use client';

import Link from 'next/link';

const pages = [
  '/admin',
  '/admin/pages',
  '/admin/venues',
  '/admin/events',
  '/admin/pricing',
  '/admin/bookings',
  '/admin/refunds',
  '/admin/reports'
] as const;

export function AdminPagesComponent() {
  return (
    <section className="admin-section stack">
      <h2>Admin Pages</h2>
      <p>Central navigation for all admin functionalities.</p>
      <div className="admin-card-grid two">
        {pages.map((path) => (
          <Link key={path} href={path} className="admin-card admin-link-card">
            {path}
          </Link>
        ))}
      </div>
    </section>
  );
}
