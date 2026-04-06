'use client';

import { FormEvent, useEffect, useState } from 'react';

type AdminEvent = { id: string; title: string; venue: string; datetime: string; description: string; pricingLink: string };

export function EventComponent() {
  const [list, setList] = useState<AdminEvent[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<AdminEvent>({ id: '', title: '', venue: '', datetime: '', description: '', pricingLink: '/admin/pricing' });

  const load = async () => {
    const [eventsRes, venuesRes] = await Promise.all([fetch('/api/events'), fetch('/api/venues')]);
    const eventsData = await eventsRes.json();
    const venuesData = await venuesRes.json();
    const venueMap = new Map((venuesData.venues || []).map((v: { id: string; name: string }) => [v.id, v.name]));
    setVenues((venuesData.venues || []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })));
    setList((eventsData.events || []).map((e: { id: string; title: string; venueId: string; startTime: string; description: string }) => ({
      id: e.id,
      title: e.title,
      venue: venueMap.get(e.venueId) || '',
      datetime: e.startTime,
      description: e.description,
      pricingLink: '/admin/pricing'
    })));
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.venue || !form.datetime || !form.description) return;
    const venueId = venues.find((v) => v.name === form.venue)?.id;
    if (!venueId) return;

    if (form.id) {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', eventId: form.id, updates: { title: form.title, description: form.description, startTime: form.datetime, venueId } })
      });
    } else {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: form.title,
          description: form.description,
          category: 'General',
          startTime: form.datetime,
          endTime: form.datetime,
          city: 'Bengaluru',
          venueId
        })
      });
    }
    setForm({ id: '', title: '', venue: venues[0]?.name || '', datetime: '', description: '', pricingLink: '/admin/pricing' });
    await load();
  };

  const editItem = (item: AdminEvent) => setForm(item);
  const deleteItem = async (id: string) => {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', eventId: id })
    });
    await load();
  };

  return (
    <section className="admin-section stack">
      <h2>Event Creation & Management</h2>
      <form className="admin-form" onSubmit={onSubmit}>
        <input className="input" placeholder="Event name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>{venues.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}</select>
        <input className="input" type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} />
        <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="input" placeholder="Pricing link" value={form.pricingLink} onChange={(e) => setForm({ ...form, pricingLink: e.target.value })} />
        <button className="btn" type="submit">{form.id ? 'Update Event' : 'Create Event'}</button>
      </form>

      <table className="admin-table">
        <thead><tr><th>Event name</th><th>Venue</th><th>Date & time</th><th>Description</th><th>Pricing link</th><th>Actions</th></tr></thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td><td>{item.venue}</td><td>{item.datetime}</td><td>{item.description}</td><td>{item.pricingLink}</td>
              <td className="row gap-sm"><button className="btn ghost" onClick={() => editItem(item)}>Edit</button><button className="btn ghost" onClick={() => deleteItem(item.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
