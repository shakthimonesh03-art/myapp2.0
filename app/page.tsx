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
    <section className="stack">
      <div className="hero">
        <h1>Book events in real time</h1>
        <p>Search by city/date/category, select seats, hold for 5 minutes, pay, and get QR tickets instantly.</p>
      </div>

      <div className="card row gap-sm wrap">
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

      <div className="grid">
        {filtered.map((event) => (
          <article key={event.id} className="card">
            <p className="pill">{event.category}</p>
            <h3>{event.title}</h3>
            <p>{event.city} • {new Date(event.datetime).toLocaleString()}</p>
            <p>{event.venue}</p>
            <p>{event.venueLayout}</p>
            <p>From ₹{event.basePrice}</p>
            <Link className="btn" href={`/events/${event.id}`}>Select seats</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
