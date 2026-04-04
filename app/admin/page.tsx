'use client';

import { FormEvent, useMemo, useState } from 'react';
import { events, venueCatalog } from '@/lib/mockData';
import { getBookings } from '@/lib/clientStore';

type DraftEvent = { title: string; city: string; category: string; price: string };

export default function AdminPage() {
  const [draftEvent, setDraftEvent] = useState<DraftEvent>({ title: '', city: '', category: '', price: '' });
  const [createdEvents, setCreatedEvents] = useState<string[]>([]);
  const [coupon, setCoupon] = useState('');
  const bookings = getBookings();

  const reports = useMemo(() => {
    const revenue = bookings.filter((b) => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.amount, 0);
    const refunds = bookings.filter((b) => b.status === 'CANCELLED').length;
    return { revenue, refunds, bookings: bookings.length };
  }, [bookings]);

  const createEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!draftEvent.title || !draftEvent.city) return;
    setCreatedEvents((prev) => [`${draftEvent.title} (${draftEvent.city})`, ...prev]);
    setDraftEvent({ title: '', city: '', category: '', price: '' });
  };

  return (
    <section className="stack">
      <h1>Admin dashboard</h1>

      <div className="grid three">
        <article className="card"><h3>Total bookings</h3><p>{reports.bookings}</p></article>
        <article className="card"><h3>Revenue</h3><p>₹{reports.revenue}</p></article>
        <article className="card"><h3>Refund requests</h3><p>{reports.refunds}</p></article>
      </div>

      <div className="grid two">
        <article className="card stack">
          <h3>Create event</h3>
          <form className="stack" onSubmit={createEvent}>
            <input className="input" placeholder="Event title" value={draftEvent.title} onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })} />
            <input className="input" placeholder="City" value={draftEvent.city} onChange={(e) => setDraftEvent({ ...draftEvent, city: e.target.value })} />
            <input className="input" placeholder="Category" value={draftEvent.category} onChange={(e) => setDraftEvent({ ...draftEvent, category: e.target.value })} />
            <input className="input" placeholder="Base price" value={draftEvent.price} onChange={(e) => setDraftEvent({ ...draftEvent, price: e.target.value })} />
            <button className="btn" type="submit">Create event</button>
          </form>
          <ul>
            {createdEvents.map((created) => <li key={created}>{created}</li>)}
          </ul>
        </article>

        <article className="card stack">
          <h3>Manage venues & seat layouts</h3>
          <ul>
            {venueCatalog.map((venue) => (
              <li key={venue.id}>{venue.name} • {venue.city} • Capacity {venue.capacity}</li>
            ))}
          </ul>
          <button className="btn ghost">Open seat-layout editor (prototype)</button>
        </article>

        <article className="card stack">
          <h3>Monitor bookings / refunds</h3>
          <ul>
            {bookings.slice(0, 6).map((booking) => (
              <li key={booking.id}>{booking.id} • {booking.eventTitle} • {booking.status}</li>
            ))}
          </ul>
          <button className="btn ghost">Issue refund (prototype)</button>
        </article>

        <article className="card stack">
          <h3>Coupons / offers</h3>
          <input className="input" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="SUMMER20" />
          <button className="btn" onClick={() => alert(`Coupon ${coupon || 'NEW10'} saved (prototype)`)}>Save coupon</button>
          <h4>Published events</h4>
          <ul>
            {events.map((event) => <li key={event.id}>{event.title} • ₹{event.basePrice}</li>)}
          </ul>
        </article>
      </div>
    </section>
  );
}
