'use client';

import { FormEvent, useEffect, useState } from 'react';

type Venue = { id: string; name: string; city: string; capacity: number };

export function VenueComponent() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState({ id: '', name: '', city: '', capacity: '' });

  const loadVenues = async () => {
    const res = await fetch('/api/venues');
    const data = await res.json();
    setVenues(data.venues || []);
  };

  useEffect(() => {
    loadVenues();
    const timer = setInterval(loadVenues, 5000);
    return () => clearInterval(timer);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.capacity) return;

    if (form.id) {
      await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', venueId: form.id, updates: { name: form.name, city: form.city, capacity: Number(form.capacity) } })
      });
    } else {
      await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: form.name, city: form.city, capacity: Number(form.capacity) })
      });
    }
    setForm({ id: '', name: '', city: '', capacity: '' });
    await loadVenues();
  };

  const editVenue = (venue: Venue) => setForm({ id: venue.id, name: venue.name, city: venue.city, capacity: String(venue.capacity) });
  const deleteVenue = async (id: string) => {
    await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', venueId: id })
    });
    await loadVenues();
  };

  return (
    <section className="admin-section stack">
      <h2>Venue Management</h2>
      <form className="admin-form" onSubmit={onSubmit}>
        <input className="input" placeholder="Venue name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="input" placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <button className="btn" type="submit">{form.id ? 'Update Venue' : 'Add Venue'}</button>
      </form>

      <table className="admin-table">
        <thead><tr><th>Name</th><th>City</th><th>Capacity</th><th>Actions</th></tr></thead>
        <tbody>
          {venues.map((venue) => (
            <tr key={venue.id}>
              <td>{venue.name}</td><td>{venue.city}</td><td>{venue.capacity}</td>
              <td className="row gap-sm"><button className="btn ghost" onClick={() => editVenue(venue)}>Edit</button><button className="btn ghost" onClick={() => deleteVenue(venue.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
