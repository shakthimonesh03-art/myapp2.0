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
  const [locationSearch, setLocationSearch] = useState('');

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
  const popularLocations = useMemo(() => locations.slice(0, 10), [locations]);
  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((city) => city.toLowerCase().includes(q));
  }, [locations, locationSearch]);

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
        <br></br>
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
            <h2>Select Location</h2>
            <input
              className="input location-search"
              placeholder="Search city, area or locality"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
            <button className="location-current-btn" onClick={() => {
              setSelectedLocation('Current Location');
              setPreferredLocationForActiveUser('Current Location');
              setLocationModalOpen(false);
            }}>
              📍 Use Current Location
            </button>
            <div className="location-popular-grid">
              {popularLocations.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedLocation(city);
                    setPreferredLocationForActiveUser(city);
                    setLocationModalOpen(false);
                  }}
                  className="location-popular-item"
                >
                  <span className="location-icon">🏙️</span>
                  <span>{city}</span>
                </button>
              ))}
            </div>
            <h3 className="location-all-title">All Cities</h3>
            <div className="location-alpha">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</div>
            <div className="location-list-columns">
              {filteredLocations.map((city) => (
                <button
                  key={`list-${city}`}
                  onClick={() => {
                    setSelectedLocation(city);
                    setPreferredLocationForActiveUser(city);
                    setLocationModalOpen(false);
                  }}
                  className="location-list-city"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
