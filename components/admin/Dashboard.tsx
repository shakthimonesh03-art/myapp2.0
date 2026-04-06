'use client';

import { useEffect, useMemo, useState } from 'react';

export function Dashboard() {
  const [events, setEvents] = useState<{ id: string }[]>([]);
  const [bookings, setBookings] = useState<{ id: string; eventId: string; totalAmount: number; status: string }[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [eventsRes, bookingsRes, usersRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/bookings?admin=1'),
        fetch('/api/user')
      ]);
      const eventsData = await eventsRes.json();
      const bookingsData = await bookingsRes.json();
      const usersData = await usersRes.json();
      setEvents(eventsData.events || []);
      setBookings(bookingsData.bookings || []);
      setTotalUsers((usersData.users || []).length);
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const totalRevenue = useMemo(() => bookings.filter((b) => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.totalAmount, 0), [bookings]);
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
              {recent.map((b) => <li key={b.id}>{b.id} • {b.eventId} • {b.status}</li>)}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
