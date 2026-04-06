'use client';

import { getBookings } from '@/lib/clientStore';
import { events } from '@/lib/mockData';

export function Dashboard() {
  const bookings = getBookings();
  const totalRevenue = bookings.filter((b) => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.amount, 0);
  const totalUsers = new Set(bookings.map((b) => b.userId)).size;
  const recent = bookings.slice(0, 5);

  const chartData = [
    { label: 'Events', value: events.length },
    { label: 'Bookings', value: bookings.length },
    { label: 'Revenue/10k', value: Math.max(1, Math.round(totalRevenue / 10000)) },
    { label: 'Users', value: Math.max(1, totalUsers) }
  ];

  const max = Math.max(...chartData.map((x) => x.value), 1);

  return (
    <section className="admin-section stack">
      <h2>Admin Dashboard</h2>
      <div className="admin-card-grid four">
        <article className="admin-card"><h3>Total Events</h3><p>{events.length}</p></article>
        <article className="admin-card"><h3>Total Bookings</h3><p>{bookings.length}</p></article>
        <article className="admin-card"><h3>Total Revenue</h3><p>₹{totalRevenue}</p></article>
        <article className="admin-card"><h3>Total Users</h3><p>{totalUsers}</p></article>
      </div>

      <div className="admin-card-grid two">
        <article className="admin-card">
          <h3>Charts / Analytics</h3>
          <div className="admin-chart">
            {chartData.map((item) => (
              <div key={item.label} className="admin-bar-wrap">
                <div className="admin-bar" style={{ height: `${Math.max(12, (item.value / max) * 120)}px` }} />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h3>Recent Activity</h3>
          {recent.length === 0 ? <p>No recent activity.</p> : (
            <ul className="stack">
              {recent.map((b) => <li key={b.id}>{b.id} • {b.eventTitle} • {b.status}</li>)}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
