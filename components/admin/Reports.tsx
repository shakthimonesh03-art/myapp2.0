'use client';

import { getBookings } from '@/lib/clientStore';

export function ReportsComponent() {
  const bookings = getBookings();
  const revenue = bookings.filter((b) => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.amount, 0);
  const byStatus = {
    confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
    cancelled: bookings.filter((b) => b.status === 'CANCELLED').length
  };

  return (
    <section className="admin-section stack">
      <h2>Reports Dashboard</h2>
      <div className="admin-card-grid three">
        <article className="admin-card"><h3>User Activity Reports</h3><p>Active users: {new Set(bookings.map((b) => b.userId)).size}</p></article>
        <article className="admin-card"><h3>Booking Reports</h3><p>Confirmed: {byStatus.confirmed} • Cancelled: {byStatus.cancelled}</p></article>
        <article className="admin-card"><h3>Revenue Reports</h3><p>Total Revenue: ₹{revenue}</p></article>
      </div>
      <div className="admin-chart">
        <div className="admin-bar-wrap"><div className="admin-bar" style={{ height: `${Math.max(14, byStatus.confirmed * 16)}px` }} /><small>Confirmed</small></div>
        <div className="admin-bar-wrap"><div className="admin-bar" style={{ height: `${Math.max(14, byStatus.cancelled * 16)}px` }} /><small>Cancelled</small></div>
        <div className="admin-bar-wrap"><div className="admin-bar" style={{ height: `${Math.max(14, Math.round(revenue / 5000) * 12)}px` }} /><small>Revenue</small></div>
      </div>
    </section>
  );
}
