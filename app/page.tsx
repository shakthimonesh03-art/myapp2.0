'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import { getPreferredLocationForActiveUser, setPreferredLocationForActiveUser } from '@/lib/clientStore';

export default function HomePage() {
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [events, setEvents] = useState<{ id: string; title: string; city: string; category: string; startTime: string; venueId: string; basePrice?: number }[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

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

  useEffect(() => {
    const load = async () => {
      const [eventsRes, venuesRes, locationsRes] = await Promise.all([fetch('/api/events'), fetch('/api/venues'), fetch('/api/locations')]);
      const eventsData = await eventsRes.json();
      const venuesData = await venuesRes.json();
      const locationsData = await locationsRes.json();
      setEvents(eventsData.events || []);
      setVenues((venuesData.venues || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
      setLocations(locationsData.locations || []);
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => events.filter((event) => {
    const cityMatch = selectedLocation ? event.city === selectedLocation : true;
    const categoryMatch = category ? event.category === category : true;
    const dateMatch = date ? event.startTime.slice(0, 10) === date : true;
    return cityMatch && categoryMatch && dateMatch;
  }), [events, selectedLocation, category, date]);
  const categories = useMemo(() => Array.from(new Set(events.map((event) => event.category))), [events]);

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
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>

        <div className="modern-grid">
          {filtered.map((event, index) => (
            <article key={event.id} className="modern-card" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="icon-chip">{index + 1}</div>
              <h3>{event.title}</h3>
              <p>{event.city} • {formatDateTime(event.startTime)}</p>
              <p>{venues.find((v) => v.id === event.venueId)?.name || event.venueId}</p>
              <div className="card-foot">
                <small>From ₹{event.basePrice || 1200}</small>
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
              {locations.map((city) => (
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
