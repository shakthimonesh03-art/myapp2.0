'use client';

import { FormEvent, useEffect, useState } from 'react';

type Venue = { id: string; name: string; city: string; capacity: number };

export function VenueComponent() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [form, setForm] = useState({ id: '', name: '', city: '', capacity: '' });
  const [layoutForm, setLayoutForm] = useState({ eventId: '', rows: '4', cols: '8', vipRows: '1', regularPrice: '1200', vipPrice: '2200' });
  const [layoutSeats, setLayoutSeats] = useState<{ id: string; category: string; status: string }[]>([]);
  const [message, setMessage] = useState('');

  const loadVenues = async () => {
    try {
      const [venueRes, eventRes, locationRes] = await Promise.all([fetch('/api/venues'), fetch('/api/events'), fetch('/api/locations')]);
      const venueData = venueRes.ok ? await venueRes.json() : { venues: [] };
      const eventData = eventRes.ok ? await eventRes.json() : { events: [] };
      const locationData = locationRes.ok ? await locationRes.json() : { locations: [] };
      setVenues(venueData.venues || []);
      setEvents((eventData.events || []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title })));
      setLocations(locationData.locations || []);
      setForm((prev) => ({ ...prev, city: prev.city || locationData.locations?.[0] || '' }));
    } catch {
      setMessage('Failed to load venue/event data. Retrying...');
    }
  };

  useEffect(() => {
    loadVenues();
    const timer = setInterval(loadVenues, 5000);
    return () => clearInterval(timer);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.capacity) return;
    try {
      if (form.id) {
        const res = await fetch('/api/venues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', venueId: form.id, updates: { name: form.name, city: form.city, capacity: Number(form.capacity) } })
        });
        if (!res.ok) throw new Error('Venue update failed');
        setMessage('Venue updated successfully.');
      } else {
        const res = await fetch('/api/venues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', name: form.name, city: form.city, capacity: Number(form.capacity) })
        });
        if (!res.ok) throw new Error('Venue create failed');
        setMessage('Venue created successfully.');
      }
      setForm({ id: '', name: '', city: '', capacity: '' });
      await loadVenues();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save venue');
    }
  };

  const editVenue = (venue: Venue) => setForm({ id: venue.id, name: venue.name, city: venue.city, capacity: String(venue.capacity) });
  const deleteVenue = async (id: string) => {
    const res = await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', venueId: id })
    });
    if (res.ok) setMessage('Venue deleted successfully.');
    await loadVenues();
  };

  const loadLayout = async (eventId: string) => {
    if (!eventId) return;
    const response = await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seat-layout', eventId })
    });
    const data = await response.json();
    setLayoutSeats(data.seats || []);
  };

  const saveLayout = async (e: FormEvent) => {
    e.preventDefault();
    if (!layoutForm.eventId) return;
    const response = await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-seat-layout', ...layoutForm })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Failed to update seat layout.');
      return;
    }
    setLayoutSeats(data.seats || []);
    setMessage('Seat layout updated and saved successfully.');
  };

  return (
    <section className="admin-section stack">
      <h2>Venue Management</h2>
      {message && <p className="muted">{message}</p>}
      <form className="admin-form" onSubmit={onSubmit}>
        <input className="input" placeholder="Venue name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
          {locations.map((location) => <option key={location} value={location}>{location}</option>)}
        </select>
        <input className="input" placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <button className="btn" type="submit">{form.id ? 'Update Venue' : 'Add Venue'}</button>
      </form>
      <div className="row gap-sm wrap">
        <input className="input" placeholder="Add new location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
        <button className="btn" type="button" onClick={async () => {
          if (!newLocation.trim()) return;
          const res = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: newLocation.trim() }) });
          if (res.ok) {
            const data = await res.json();
            setLocations(data.locations || []);
            setForm((prev) => ({ ...prev, city: newLocation.trim() }));
            setNewLocation('');
            setMessage('Location added successfully.');
          }
        }}>Add Location</button>
      </div>

      <table className="admin-table">
        <thead><tr><th>Name</th><th>City</th><th>Capacity</th><th>Actions</th></tr></thead>
        <tbody>
          {venues.map((venue) => (
            <tr key={venue.id}>
              <td>{venue.name}</td><td>{venue.city}</td><td>{venue.capacity}</td>
              <td className="row gap-sm"><button className="btn ghost" type="button" onClick={() => editVenue(venue)}>Edit</button><button className="btn ghost" type="button" onClick={() => deleteVenue(venue.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <article className="admin-card stack">
        <h3>Seat Layout Editing (Per Event)</h3>
        <form className="admin-form" onSubmit={saveLayout}>
          <select
            className="input"
            value={layoutForm.eventId}
            onChange={async (e) => {
              const eventId = e.target.value;
              setLayoutForm({ ...layoutForm, eventId });
              await loadLayout(eventId);
            }}
          >
            <option value="">Select event</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
          <input className="input" type="number" min={1} placeholder="Rows" value={layoutForm.rows} onChange={(e) => setLayoutForm({ ...layoutForm, rows: e.target.value })} />
          <input className="input" type="number" min={1} placeholder="Columns" value={layoutForm.cols} onChange={(e) => setLayoutForm({ ...layoutForm, cols: e.target.value })} />
          <input className="input" type="number" min={0} placeholder="VIP Rows" value={layoutForm.vipRows} onChange={(e) => setLayoutForm({ ...layoutForm, vipRows: e.target.value })} />
          <input className="input" type="number" min={1} placeholder="Regular Price" value={layoutForm.regularPrice} onChange={(e) => setLayoutForm({ ...layoutForm, regularPrice: e.target.value })} />
          <input className="input" type="number" min={1} placeholder="VIP Price" value={layoutForm.vipPrice} onChange={(e) => setLayoutForm({ ...layoutForm, vipPrice: e.target.value })} />
          <button className="btn" type="submit">Save Seat Layout</button>
        </form>

        <div className="seat-grid">
          {layoutSeats.map((seat) => (
            <div key={seat.id} className={`seat-cell ${seat.category === 'VIP' ? 'vip' : ''}`}>
              <span>{seat.id}</span>
              <small>{seat.category}</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
