'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { events, venueCatalog } from '@/lib/mockData';
import { buildS3Url } from '@/lib/s3Config';
import { getActiveUser, getBookings } from '@/lib/clientStore';

type DraftEvent = { title: string; city: string; category: string; price: string };

export default function AdminPage() {
  const [draftEvent, setDraftEvent] = useState<DraftEvent>({ title: '', city: '', category: '', price: '' });
  const [isAdmin, setIsAdmin] = useState(false);
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


  useEffect(() => {
    const user = getActiveUser();
    setIsAdmin(user?.role === 'admin');
  }, []);

  if (!isAdmin) {
    return (
      <section className="modern-page stack-xl">
        <header className="modern-header">
          <h1>Access denied</h1>
          <p>Admin dashboard is only visible for admin users.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="modern-page stack-xl">
      <header className="modern-header">
        <h1>Admin Command Center</h1>
        <p>Manage venues, events, pricing, coupons, refunds and reporting from one place.</p>
      </header>

      <div className="modern-grid">
        <article className="modern-card"><h3>Total bookings</h3><p>{reports.bookings}</p></article>
        <article className="modern-card"><h3>Revenue</h3><p>₹{reports.revenue}</p></article>
        <article className="modern-card"><h3>Refund requests</h3><p>{reports.refunds}</p></article>
      </div>

      <div className="modern-grid">
        <article className="modern-card stack">
          <h3>Create Event</h3>
          <form className="stack" onSubmit={createEvent}>
            <input className="input" placeholder="Event title" value={draftEvent.title} onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })} />
            <input className="input" placeholder="City" value={draftEvent.city} onChange={(e) => setDraftEvent({ ...draftEvent, city: e.target.value })} />
            <input className="input" placeholder="Category" value={draftEvent.category} onChange={(e) => setDraftEvent({ ...draftEvent, category: e.target.value })} />
            <input className="input" placeholder="Base price" value={draftEvent.price} onChange={(e) => setDraftEvent({ ...draftEvent, price: e.target.value })} />
            <button className="btn" type="submit">Create event</button>
          </form>
          <ul>{createdEvents.map((created) => <li key={created}>{created}</li>)}</ul>
        </article>

        <article className="modern-card stack">
          <h3>Venue + Seat Layouts</h3>
          <ul>{venueCatalog.map((venue) => <li key={venue.id}>{venue.name} • {venue.city} • Capacity {venue.capacity}</li>)}</ul>
          <button className="btn ghost">Open seat-layout editor</button>
        </article>

        <article className="modern-card stack">
          <h3>Bookings / Refunds</h3>
          <ul>{bookings.slice(0, 6).map((booking) => <li key={booking.id}>{booking.id} • {booking.eventTitle} • {booking.status}</li>)}</ul>
          <button className="btn ghost">Issue refund</button>
        </article>

        <article className="modern-card stack">
          <h3>Coupons / Offers</h3>
          <input className="input" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="SUMMER20" />
          <button className="btn" onClick={() => alert(`Coupon ${coupon || 'NEW10'} saved`)}>Save coupon</button>
          <h4>Published events</h4>
          <ul>{events.map((event) => <li key={event.id}>{event.title} • Banner: {buildS3Url('eventBanner', `${event.id}.jpg`)}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}
