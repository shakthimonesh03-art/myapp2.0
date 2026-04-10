'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type AdminEvent = { id: string; title: string; venue: string; city: string; category: string; datetime: string; description: string; pricingLink: string };

export function EventComponent() {
  const [list, setList] = useState<AdminEvent[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [form, setForm] = useState<AdminEvent>({ id: '', title: '', venue: '', city: '', category: 'Music', datetime: '', description: '', pricingLink: '/admin/pricing' });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setMessage('');
      const [eventsRes, venuesRes, locationsRes] = await Promise.all([fetch('/api/events'), fetch('/api/venues'), fetch('/api/locations')]);
      const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
      const venuesData = venuesRes.ok ? await venuesRes.json() : { venues: [] };
      const locationsData = locationsRes.ok ? await locationsRes.json() : { locations: [] };
      const venueMap = new Map((venuesData.venues || []).map((v: { id: string; name: string }) => [v.id, v.name]));
      const loadedVenues = (venuesData.venues || []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name }));
      setVenues(loadedVenues);
      setLocations(locationsData.locations || []);
      setList((eventsData.events || []).map((e: { id: string; title: string; venueId: string; startTime: string; description: string }) => ({
        id: e.id,
        title: e.title,
        venue: venueMap.get(e.venueId) || '',
        city: (e as { city?: string }).city || '',
        category: (e as { category?: string }).category || 'General',
        datetime: e.startTime,
        description: e.description,
        pricingLink: '/admin/pricing'
      })));
      setForm((prev) => ({ ...prev, venue: prev.venue || loadedVenues[0]?.name || '', city: prev.city || locationsData.locations?.[0] || '' }));
    } catch {
      setMessage('Unable to fetch events right now. Retrying...');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.venue || !form.datetime || !form.description || !form.city || !form.category) {
      setMessage('Please fill all required fields before submit.');
      return;
    }
    const venueId = venues.find((v) => v.name === form.venue)?.id;
    if (!venueId) {
      setMessage('Please select a valid venue.');
      return;
    }

    try {
      if (form.id) {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', eventId: form.id, updates: { title: form.title, category: form.category, city: form.city, description: form.description, startTime: form.datetime, venueId } })
        });
        if (!res.ok) throw new Error('Update failed');
        setMessage('Event updated successfully.');
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            title: form.title,
            description: form.description,
            category: form.category,
            startTime: form.datetime,
            endTime: form.datetime,
            city: form.city,
            venueId
          })
        });
        if (!res.ok) throw new Error('Create failed');
        setMessage('Event created successfully.');
      }
      setForm({ id: '', title: '', venue: venues[0]?.name || '', city: locations[0] || '', category: 'Music', datetime: '', description: '', pricingLink: '/admin/pricing' });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save event.');
    }
  };

  const editItem = (item: AdminEvent) => setForm(item);
  const deleteItem = async (id: string) => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', eventId: id })
    });
    if (res.ok) setMessage('Event deleted successfully.');
    await load();
  };

  return (
    <section className="admin-section stack">
      <h2>Event Creation & Management</h2>
      {message && <p className="muted">{message}</p>}
      <form className="admin-form event-form" onSubmit={onSubmit}>
        <label className="stack"><span>Event name</span><input className="input" placeholder="Event name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="stack"><span>Venue</span><select className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>{venues.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}</select></label>
        <label className="stack"><span>Location</span><select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}</select></label>
        <label className="stack"><span>Category</span><input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
        <label className="stack"><span>Date & time</span><input className="input" type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} /></label>
        <label className="stack"><span>Description</span><input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="stack"><span>Pricing link</span><input className="input" placeholder="Pricing link" value={form.pricingLink} onChange={(e) => setForm({ ...form, pricingLink: e.target.value })} /></label>
        <button className="btn" type="submit">{form.id ? 'Update Event' : 'Create Event'}</button>
      </form>

      <table className="admin-table">
        <thead><tr><th>Event name</th><th>Venue</th><th>Location</th><th>Category</th><th>Date & time</th><th>Description</th><th>Pricing link</th><th>Actions</th></tr></thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td><td>{item.venue}</td><td>{item.city}</td><td>{item.category}</td><td>{item.datetime}</td><td>{item.description}</td><td>{item.pricingLink}</td>
              <td className="row gap-sm"><button className="btn ghost" type="button" onClick={() => editItem(item)}>Edit</button><button className="btn ghost" type="button" onClick={() => deleteItem(item.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
