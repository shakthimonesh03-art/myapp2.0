'use client';

import { FormEvent, useState } from 'react';
import { events, venueCatalog } from '@/lib/mockData';

type AdminEvent = { id: string; title: string; venue: string; datetime: string; description: string; pricingLink: string };

export function EventComponent() {
  const [list, setList] = useState<AdminEvent[]>(events.map((e) => ({
    id: e.id,
    title: e.title,
    venue: e.venue,
    datetime: e.datetime,
    description: e.venueLayout,
    pricingLink: '/admin/pricing'
  })));

  const [form, setForm] = useState<AdminEvent>({ id: '', title: '', venue: venueCatalog[0]?.name || '', datetime: '', description: '', pricingLink: '/admin/pricing' });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.venue || !form.datetime || !form.description) return;

    if (form.id) {
      setList((prev) => prev.map((item) => item.id === form.id ? form : item));
    } else {
      setList((prev) => [{ ...form, id: `ev-${Date.now()}` }, ...prev]);
    }
    setForm({ id: '', title: '', venue: venueCatalog[0]?.name || '', datetime: '', description: '', pricingLink: '/admin/pricing' });
  };

  const editItem = (item: AdminEvent) => setForm(item);
  const deleteItem = (id: string) => setList((prev) => prev.filter((item) => item.id !== id));

  return (
    <section className="admin-section stack">
      <h2>Event Creation & Management</h2>
      <form className="admin-form" onSubmit={onSubmit}>
        <input className="input" placeholder="Event name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>{venueCatalog.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}</select>
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
