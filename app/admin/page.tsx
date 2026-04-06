'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { events, venueCatalog } from '@/lib/mockData';
import { buildS3Url } from '@/lib/s3Config';
import { getActiveUser, getBookings } from '@/lib/clientStore';

type DraftEvent = { title: string; city: string; category: string; price: string };
type DraftVenue = { name: string; city: string; capacity: string };

export default function AdminPage() {
  const [draftEvent, setDraftEvent] = useState<DraftEvent>({ title: '', city: '', category: '', price: '' });
  const [draftVenue, setDraftVenue] = useState<DraftVenue>({ name: '', city: '', capacity: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<{ title: string; city: string; category: string; price: number }[]>([]);
  const [managedVenues, setManagedVenues] = useState(venueCatalog);
  const [pricing, setPricing] = useState<Record<string, number>>(() =>
    Object.fromEntries(events.map((event) => [event.id, event.basePrice]))
  );
  const [refundDone, setRefundDone] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const bookings = getBookings();

  const reports = useMemo(() => {
    const revenue = bookings.filter((b) => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.amount, 0);
    const refunds = bookings.filter((b) => b.status === 'CANCELLED').length;
    const activeUsers = new Set(bookings.map((b) => b.userId)).size;
    return { revenue, refunds, bookings: bookings.length, activeUsers };
  }, [bookings]);

  const createEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!draftEvent.title || !draftEvent.city || !draftEvent.price) return;
    setCreatedEvents((prev) => [{ title: draftEvent.title, city: draftEvent.city, category: draftEvent.category || 'General', price: Number(draftEvent.price) }, ...prev]);
    setDraftEvent({ title: '', city: '', category: '', price: '' });
    setMessage('Event created successfully.');
  };

  const addVenue = (event: FormEvent) => {
    event.preventDefault();
    if (!draftVenue.name || !draftVenue.city || !draftVenue.capacity) return;
    setManagedVenues((prev) => [{ id: `v-${Date.now()}`, name: draftVenue.name, city: draftVenue.city, capacity: Number(draftVenue.capacity) }, ...prev]);
    setDraftVenue({ name: '', city: '', capacity: '' });
    setMessage('Venue added to management list.');
  };

  const updatePrice = (eventId: string, value: number) => {
    setPricing((prev) => ({ ...prev, [eventId]: value }));
    setMessage(`Pricing updated for ${eventId}.`);
  };

  const proceedRefund = (bookingId: string) => {
    setRefundDone((prev) => prev.includes(bookingId) ? prev : [bookingId, ...prev]);
    setMessage(`Refund processed for ${bookingId}.`);
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
        <p>Manage venues, events, pricing, bookings, refunds and reports from one beginner-friendly console.</p>
        {message && <p className="muted">{message}</p>}
      </header>

      <div className="modern-grid">
        <article className="modern-card stack">
          <h3>Admin pages</h3>
          <ul>
            <li>Admin dashboard</li>
            <li>Venue management</li>
            <li>Event creation</li>
            <li>Pricing configuration</li>
            <li>Booking list</li>
            <li>Refund panel</li>
            <li>Reports dashboard</li>
          </ul>
        </article>

        <article className="modern-card">
          <h3>Admin dashboard</h3>
          <p>Total bookings: {reports.bookings}</p>
          <p>Revenue: ₹{reports.revenue}</p>
          <p>Refund requests: {reports.refunds}</p>
          <p>Active users: {reports.activeUsers}</p>
        </article>

        <article className="modern-card">
          <h3>Reports dashboard</h3>
          <p>Cancellation rate: {reports.bookings ? Math.round((reports.refunds / reports.bookings) * 100) : 0}%</p>
          <p>Confirmation count: {bookings.filter((b) => b.status === 'CONFIRMED').length}</p>
          <p>Processed refunds: {refundDone.length}</p>
        </article>
      </div>

      <div className="modern-grid">
        <article className="modern-card stack">
          <h3>Event creation</h3>
          <form className="stack" onSubmit={createEvent}>
            <input className="input" placeholder="Event title" value={draftEvent.title} onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })} />
            <input className="input" placeholder="City" value={draftEvent.city} onChange={(e) => setDraftEvent({ ...draftEvent, city: e.target.value })} />
            <input className="input" placeholder="Category" value={draftEvent.category} onChange={(e) => setDraftEvent({ ...draftEvent, category: e.target.value })} />
            <input className="input" placeholder="Base price" value={draftEvent.price} onChange={(e) => setDraftEvent({ ...draftEvent, price: e.target.value })} />
            <button className="btn" type="submit">Create event</button>
          </form>
          <ul>{createdEvents.map((created) => <li key={`${created.title}-${created.city}`}>{created.title} • {created.city} • {created.category} • ₹{created.price}</li>)}</ul>
        </article>

        <article className="modern-card stack">
          <h3>Venue management</h3>
          <form className="stack" onSubmit={addVenue}>
            <input className="input" placeholder="Venue name" value={draftVenue.name} onChange={(e) => setDraftVenue({ ...draftVenue, name: e.target.value })} />
            <input className="input" placeholder="City" value={draftVenue.city} onChange={(e) => setDraftVenue({ ...draftVenue, city: e.target.value })} />
            <input className="input" placeholder="Capacity" value={draftVenue.capacity} onChange={(e) => setDraftVenue({ ...draftVenue, capacity: e.target.value })} />
            <button className="btn" type="submit">Add venue</button>
          </form>
          <ul>{managedVenues.map((venue) => <li key={venue.id}>{venue.name} • {venue.city} • Capacity {venue.capacity}</li>)}</ul>
        </article>

        <article className="modern-card stack">
          <h3>Booking list</h3>
          <ul>{bookings.slice(0, 6).map((booking) => <li key={booking.id}>{booking.id} • {booking.eventTitle} • {booking.status}</li>)}</ul>
        </article>

        <article className="modern-card stack">
          <h3>Refund panel</h3>
          {bookings.filter((booking) => booking.status === 'CANCELLED').length === 0 ? (
            <p>No refund requests right now.</p>
          ) : (
            <ul className="stack">
              {bookings.filter((booking) => booking.status === 'CANCELLED').map((booking) => (
                <li key={booking.id} className="row between center wrap">
                  <span>{booking.id} • ₹{booking.amount}</span>
                  <button className="btn ghost" onClick={() => proceedRefund(booking.id)}>
                    {refundDone.includes(booking.id) ? 'Refunded' : 'Proceed refund'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="modern-card stack">
          <h3>Pricing configuration</h3>
          <p>Set and manage base prices for all events.</p>
          <ul className="stack">
            {events.map((event) => (
              <li key={event.id} className="row between center wrap">
                <span>{event.title}</span>
                <div className="row gap-sm center">
                  <input
                    className="input"
                    style={{ width: 120 }}
                    type="number"
                    min={1}
                    value={pricing[event.id] || event.basePrice}
                    onChange={(e) => updatePrice(event.id, Number(e.target.value))}
                  />
                  <span className="muted">Banner: {buildS3Url('eventBanner', `${event.id}.jpg`)}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
