'use client';

import { useEffect, useMemo, useState } from 'react';

export function BookingComponent() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [bookings, setBookings] = useState<{ id: string; userId: string; eventId: string; seats: string[]; totalAmount: number; status: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const res = await fetch('/api/bookings?admin=1');
        const data = res.ok ? await res.json() : { bookings: [] };
        setBookings(data.bookings || []);
      } catch {
        setError('Failed to load bookings. Retrying...');
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => bookings.filter((b) =>
    (status === 'ALL' || b.status === status)
    && (!search || `${b.id} ${b.eventId}`.toLowerCase().includes(search.toLowerCase()))
  ), [bookings, search, status]);

  return (
    <section className="admin-section stack">
      <h2>Booking List Management</h2>
      {error && <p className="muted">{error}</p>}
      <div className="row gap-sm wrap">
        <input className="input" placeholder="Search bookings" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <table className="admin-table">
        <thead><tr><th>Booking ID</th><th>User</th><th>Event</th><th>Seats</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {filtered.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td><td>{b.userId}</td><td>{b.eventId}</td><td>{b.seats.join(', ')}</td><td>₹{b.totalAmount}</td>
              <td><span className={`status-badge ${b.status === 'CONFIRMED' ? 'ok' : 'warn'}`}>{b.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
