'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import { getPreferredLocationForActiveUser, setPreferredLocationForActiveUser } from '@/lib/clientStore';
import { events } from '@/lib/mockData';

const LOCATIONS = ['Bengaluru', 'Mumbai', 'Hyderabad', 'New York', 'Dubai'];

export default function HomePage() {
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const saved = getPreferredLocationForActiveUser();
    if (saved) {
      setSelectedLocation(saved);
      setLocationModalOpen(false);
      return;
    }
    const timer = setTimeout(() => setLocationModalOpen(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => events.filter((event) => {
    const cityMatch = selectedLocation ? event.city === selectedLocation : true;
    const categoryMatch = category ? event.category === category : true;
    const dateMatch = date ? event.datetime.slice(0, 10) === date : true;
    return cityMatch && categoryMatch && dateMatch;
  }), [selectedLocation, category, date]);

  return (
    <section className="modern-page">
      <nav className="modern-nav">
        <div className="logo">TicketPulse</div>
        <div className="modern-actions">
          <button onClick={() => setLocationModalOpen(true)} className="location-btn">
            📍 {selectedLocation || 'Select Location'}
          </button>
        </div>
      </nav>

      <main className="modern-main">
        <header className="modern-header">
          <h1>Welcome back!</h1>
          <p>
            Here is what&apos;s happening in{' '}
            <span>{selectedLocation || 'your area'}</span>
          </p>
        </header>

        <div className="panel filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="Music">Music</option>
            <option value="Comedy">Comedy</option>
            <option value="Tech">Tech</option>
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>

        <div className="modern-grid">
          {filtered.map((event, index) => (
            <article key={event.id} className="modern-card" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="icon-chip">{index + 1}</div>
              <h3>{event.title}</h3>
              <p>{event.city} • {formatDateTime(event.datetime)}</p>
              <p>{event.venue}</p>
              <p>{event.venueLayout}</p>
              <div className="card-foot">
                <small>From ₹{event.basePrice}</small>
                <Link className="btn" href={`/events/${event.id}`}>Book Now</Link>
              </div>
            </article>
          ))}
        </div>
      </main>

      {isLocationModalOpen && (
        <div className="modal-root">
          <div className="modal-backdrop" onClick={() => setLocationModalOpen(false)} />
          <div className="modal-card pop-in">
            <h2>Choose your location</h2>
            <p>Select a city to customize your event experience.</p>
            <div className="location-list">
              {LOCATIONS.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedLocation(city);
                    setPreferredLocationForActiveUser(city);
                    setLocationModalOpen(false);
                  }}
                  className="location-item"
                >
                  <span>{city}</span>
                  <span>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
