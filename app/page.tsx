'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { events } from '@/lib/mockData';

export default function HomePage() {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  const filtered = useMemo(() => events.filter((event) => {
    const cityMatch = city ? event.city === city : true;
    const categoryMatch = category ? event.category === category : true;
    const dateMatch = date ? event.datetime.slice(0, 10) === date : true;
    return cityMatch && categoryMatch && dateMatch;
  }), [city, category, date]);

  return (
    <section className="stack-xl">
      <div className="hero-shell">
        <div className="hero-content">
          <p className="eyebrow">Live Event Ticketing Platform</p>
          <h1>Discover, hold seats instantly, and pay via Razorpay UPI.</h1>
          <p className="subtitle">A complete event booking experience with search, seat maps, checkout, QR tickets, and admin controls.</p>
          <div className="hero-cta">
            <Link href="/auth" className="btn">Get Started</Link>
            <Link href="/admin" className="btn ghost">Admin Dashboard</Link>
          </div>
        </div>
        <div className="hero-stats">
          <article><strong>11+</strong><span>Core Services</span></article>
          <article><strong>5 min</strong><span>Seat Hold Window</span></article>
          <article><strong>UPI</strong><span>Razorpay Checkout</span></article>
        </div>
      </div>

      <div className="panel filters">
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Mumbai">Mumbai</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="Music">Music</option>
          <option value="Comedy">Comedy</option>
          <option value="Tech">Tech</option>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </div>

      <div className="event-grid">
        {filtered.map((event) => (
          <article key={event.id} className="event-card">
            <p className="pill">{event.category}</p>
            <h3>{event.title}</h3>
            <p>{event.city} • {new Date(event.datetime).toLocaleString()}</p>
            <p>{event.venue}</p>
            <p>{event.venueLayout}</p>
            <div className="card-foot">
              <p>From ₹{event.basePrice}</p>
              <Link className="btn" href={`/events/${event.id}`}>Select Seats</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
