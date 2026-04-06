'use client';

import { useEffect, useState } from 'react';

type Tier = { silver: number; gold: number; vip: number };

export function PricingComponent() {
  const [events, setEvents] = useState<{ id: string; title: string; basePrice?: number }[]>([]);
  const [pricing, setPricing] = useState<Record<string, Tier>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      const list = data.events || [];
      setEvents(list);
      setPricing((prev) => {
        const next = { ...prev };
        list.forEach((e: { id: string; basePrice?: number; pricingTiers?: Tier }) => {
          const base = e.basePrice || 1000;
          next[e.id] = e.pricingTiers || next[e.id] || { silver: base, gold: base + 300, vip: base + 900 };
        });
        return next;
      });
    } catch {
      setError('Unable to load pricing data.');
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const update = (eventId: string, tier: keyof Tier, value: number) => {
    setPricing((prev) => ({ ...prev, [eventId]: { ...prev[eventId], [tier]: value } }));
  };

  return (
    <section className="admin-section stack">
      <h2>Pricing Configuration</h2>
      {message && <p className="muted">{message}</p>}
      {error && <p className="muted">{error}</p>}
      <table className="admin-table">
        <thead><tr><th>Event</th><th>Silver</th><th>Gold</th><th>VIP</th><th>Action</th></tr></thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.title}</td>
              <td><input className="input" type="number" value={pricing[event.id]?.silver ?? event.basePrice ?? 1000} onChange={(e) => update(event.id, 'silver', Number(e.target.value))} /></td>
              <td><input className="input" type="number" value={pricing[event.id]?.gold ?? (event.basePrice ?? 1000) + 300} onChange={(e) => update(event.id, 'gold', Number(e.target.value))} /></td>
              <td><input className="input" type="number" value={pricing[event.id]?.vip ?? (event.basePrice ?? 1000) + 900} onChange={(e) => update(event.id, 'vip', Number(e.target.value))} /></td>
              <td><button className="btn" type="button" onClick={async () => {
                try {
                  setMessage('');
                  setError('');
                  const current = pricing[event.id];
                  if (!current) throw new Error('No pricing loaded');
                  const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', eventId: event.id, updates: { basePrice: current.silver, pricingTiers: current } })
                  });
                  if (!res.ok) throw new Error('Update failed');
                  await load();
                  setMessage(`Pricing updated for ${event.title}.`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Pricing update failed.');
                }
              }}>Update Pricing</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
