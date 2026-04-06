'use client';

import { FormEvent, useState } from 'react';
import { venueCatalog } from '@/lib/mockData';

type Venue = { id: string; name: string; city: string; capacity: number };

export function VenueComponent() {
  const [venues, setVenues] = useState<Venue[]>(venueCatalog);
  const [form, setForm] = useState({ id: '', name: '', city: '', capacity: '' });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.capacity) return;

    if (form.id) {
      setVenues((prev) => prev.map((v) => v.id === form.id ? { ...v, name: form.name, city: form.city, capacity: Number(form.capacity) } : v));
    } else {
      setVenues((prev) => [{ id: `v-${Date.now()}`, name: form.name, city: form.city, capacity: Number(form.capacity) }, ...prev]);
    }
    setForm({ id: '', name: '', city: '', capacity: '' });
  };

  const editVenue = (venue: Venue) => setForm({ id: venue.id, name: venue.name, city: venue.city, capacity: String(venue.capacity) });
  const deleteVenue = (id: string) => setVenues((prev) => prev.filter((v) => v.id !== id));

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
