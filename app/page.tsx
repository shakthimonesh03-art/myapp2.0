'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { events } from '@/lib/mockData';

export default function HomePage() {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(() => events.filter((event) => {
    const cityMatch = city ? event.city === city : true;
    const categoryMatch = category ? event.category === category : true;
    return cityMatch && categoryMatch;
  }), [city, category]);

  return (
    <section className="stack">
      <div className="hero">
        <h1>Real-time ticket booking that feels instant</h1>
        <p>Browse events, lock seats for 5 minutes, and confirm with QR ticket delivery.</p>
      </div>

      <div className="card row gap-sm">
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
      </div>

      <div className="grid">
        {filtered.map((event) => (
          <article key={event.id} className="card">
            <p className="pill">{event.category}</p>
            <h3>{event.title}</h3>
            <p>{event.city} • {new Date(event.datetime).toLocaleString()}</p>
            <p>{event.venue}</p>
            <p>From ₹{event.basePrice}</p>
            <Link className="btn" href={`/events/${event.id}`}>View seats</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
