'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getActiveUser } from '@/lib/clientStore';
import { events, type EventCard } from '@/lib/mockData';
import { LOCATIONS } from '@/lib/locations';

type DraftEvent = {
  title: string;
  city: string;
  category: string;
  venue: string;
  datetime: string;
  imageUrl: string;
};

type BookingItem = {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  seats: string[];
  totalAmount: number;
  status: string;
  createdAt: number;
};

const DEFAULT_EVENT_IMAGES: Record<string, string> = {
  Music: 'https://unsplash.com/photos/QOajY0MNp8Y/download?force=true&w=1600',
  Comedy: 'https://unsplash.com/photos/ugRPTKqcNyU/download?force=true&w=1600',
  Tech: 'https://unsplash.com/photos/AsxOJcsaR4g/download?force=true&w=1600'
};

const BOOKING_STATUSES = ['PAYMENT_IN_PROGRESS', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED'];

function resolveDefaultImage(category: string) {
  return DEFAULT_EVENT_IMAGES[category] || DEFAULT_EVENT_IMAGES.Tech;
}

export default function AdminPage() {
  const [draftEvent, setDraftEvent] = useState<DraftEvent>({
    title: '',
    city: '',
    category: 'Music',
    venue: '',
    datetime: '',
    imageUrl: ''
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [managedEvents, setManagedEvents] = useState<EventCard[]>(() => events.map((event) => ({ ...event })));
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingEdits, setBookingEdits] = useState<Record<string, { status: string; amount: string }>>({});
  const [message, setMessage] = useState('');
  const [savingBookingId, setSavingBookingId] = useState('');

  useEffect(() => {
    const user = getActiveUser();
    setIsAdmin(user?.role === 'admin');
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const loadBookings = async () => {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      if (!cancelled && response.ok) {
        const nextBookings = Array.isArray(data.bookings) ? (data.bookings as BookingItem[]) : [];
        setBookings(nextBookings);
        setBookingEdits((prev) => {
          const next = { ...prev };
          nextBookings.forEach((booking) => {
            if (!next[booking.id]) {
              next[booking.id] = { status: booking.status, amount: String(booking.totalAmount) };
            }
          });
          return next;
        });
      }
    };

    void loadBookings();
    const timer = setInterval(() => {
      void loadBookings();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAdmin]);

  const reports = useMemo(() => {
    const revenue = bookings.filter((booking) => booking.status === 'CONFIRMED').reduce((sum, booking) => sum + booking.totalAmount, 0);
    const refunds = bookings.filter((booking) => booking.status === 'CANCELLED').length;
    return { revenue, refunds, bookings: bookings.length };
  }, [bookings]);

  const createEvent = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!draftEvent.title.trim() || !draftEvent.city.trim() || !draftEvent.venue.trim()) {
      setMessage('Title, city, and venue are required.');
      return;
    }

    const datetime = draftEvent.datetime ? new Date(draftEvent.datetime).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const category = draftEvent.category || 'Music';

    const nextEvent: EventCard = {
      id: `ev${Date.now()}`,
      title: draftEvent.title.trim(),
      city: draftEvent.city.trim(),
      category,
      venue: draftEvent.venue.trim(),
      datetime,
      basePrice: 5,
      venueLayout: 'General admission layout. Doors open 45 minutes before show.',
      imageUrl: draftEvent.imageUrl.trim() || resolveDefaultImage(category)
    };

    setManagedEvents((prev) => [nextEvent, ...prev]);
    events.unshift(nextEvent);
    setDraftEvent({ title: '', city: '', category: 'Music', venue: '', datetime: '', imageUrl: '' });
    setMessage('Event created successfully in admin dashboard.');
  };

  const removeEvent = (eventId: string) => {
    setManagedEvents((prev) => prev.filter((event) => event.id !== eventId));
    const index = events.findIndex((event) => event.id === eventId);
    if (index !== -1) events.splice(index, 1);
    setMessage('Event removed from dashboard.');
  };

  const updateBooking = async (bookingId: string, nextStatus: string, nextAmount: number) => {
    setSavingBookingId(bookingId);
    setMessage('');
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-admin',
        bookingId,
        status: nextStatus,
        totalAmount: nextAmount
      })
    });
    const data = await response.json();
    setSavingBookingId('');

    if (!response.ok) {
      setMessage(data.error || 'Unable to update booking.');
      return;
    }

    setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? { ...booking, status: data.booking.status, totalAmount: data.booking.totalAmount } : booking)));
    setBookingEdits((prev) => ({
      ...prev,
      [bookingId]: {
        status: data.booking.status,
        amount: String(data.booking.totalAmount)
      }
    }));
    setMessage(`Booking ${bookingId} updated.`);
  };

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
        <h1>Admin Event Dashboard</h1>
        <p>This is admin-only space to manage all events and bookings.</p>
      </header>

      <div className="modern-grid">
        <article className="modern-card">
          <h3>Total events</h3>
          <p>{managedEvents.length}</p>
        </article>
        <article className="modern-card">
          <h3>Total bookings</h3>
          <p>{reports.bookings}</p>
        </article>
        <article className="modern-card">
          <h3>Revenue</h3>
          <p>₹{reports.revenue}</p>
        </article>
        <article className="modern-card">
          <h3>Refund requests</h3>
          <p>{reports.refunds}</p>
        </article>
      </div>

      <article className="modern-card stack">
        <h3>Create Event</h3>
        <form className="stack" onSubmit={createEvent}>
          <input className="input" placeholder="Event title" value={draftEvent.title} onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })} />
          <select value={draftEvent.city} onChange={(e) => setDraftEvent({ ...draftEvent, city: e.target.value })}>
            <option value="">Select a city</option>
            {LOCATIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select value={draftEvent.category} onChange={(e) => setDraftEvent({ ...draftEvent, category: e.target.value })}>
            <option value="Music">Music</option>
            <option value="Comedy">Comedy</option>
            <option value="Tech">Tech</option>
          </select>
          <input className="input" placeholder="Venue" value={draftEvent.venue} onChange={(e) => setDraftEvent({ ...draftEvent, venue: e.target.value })} />
          <input className="input" type="datetime-local" value={draftEvent.datetime} onChange={(e) => setDraftEvent({ ...draftEvent, datetime: e.target.value })} />
          <input className="input" placeholder="Image URL (optional)" value={draftEvent.imageUrl} onChange={(e) => setDraftEvent({ ...draftEvent, imageUrl: e.target.value })} />
          <p>Seat/event price is fixed at ₹5 for all events.</p>
          {message && <p>{message}</p>}
          <button className="btn" type="submit">Create event</button>
        </form>
      </article>

      <article className="modern-card stack">
        <h3>Manage All Events</h3>
        <div className="admin-event-list">
          {managedEvents.map((event) => (
            <article key={event.id} className="admin-event-item">
              <img src={event.imageUrl} alt={`${event.title} poster`} className="admin-event-thumb" referrerPolicy="no-referrer" />
              <div>
                <h4>{event.title}</h4>
                <p>
                  {event.city} • {event.category}
                </p>
                <p>{event.venue}</p>
                <p>{new Date(event.datetime).toLocaleString()}</p>
                <p>Price: ₹{event.basePrice}</p>
              </div>
              <div className="admin-event-actions">
                <Link className="btn ghost" href={`/events/${event.id}`}>
                  Open
                </Link>
                <button className="btn ghost" type="button" onClick={() => removeEvent(event.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="modern-card stack">
        <h3>Manage Booking Values</h3>
        {bookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <div className="admin-event-list">
            {bookings.map((booking) => {
              const localStatus = bookingEdits[booking.id]?.status || booking.status;
              const localAmount = bookingEdits[booking.id]?.amount || String(booking.totalAmount);

              return (
                <article key={booking.id} className="admin-event-item">
                  <div>
                    <h4>{booking.id}</h4>
                    <p>{booking.eventTitle}</p>
                    <p>Seats: {booking.seats.join(', ')}</p>
                    <p>User: {booking.userId}</p>
                  </div>
                  <div className="stack">
                    <select
                      value={localStatus}
                      onChange={(e) =>
                        setBookingEdits((prev) => ({
                          ...prev,
                          [booking.id]: { status: e.target.value, amount: localAmount }
                        }))
                      }
                    >
                      {BOOKING_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      value={localAmount}
                      onChange={(e) =>
                        setBookingEdits((prev) => ({
                          ...prev,
                          [booking.id]: { status: localStatus, amount: e.target.value }
                        }))
                      }
                    />
                  </div>
                  <div className="admin-event-actions">
                    <button
                      className="btn"
                      type="button"
                      disabled={savingBookingId === booking.id}
                      onClick={() => {
                        const parsedAmount = Number(localAmount);
                        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                          setMessage('Amount should be a valid number.');
                          return;
                        }
                        void updateBooking(booking.id, localStatus, parsedAmount);
                      }}
                    >
                      {savingBookingId === booking.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}