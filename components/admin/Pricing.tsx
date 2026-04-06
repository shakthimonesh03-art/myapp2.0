'use client';

import { useEffect, useState } from 'react';

type Tier = { silver: number; gold: number; vip: number };

export function PricingComponent() {
  const [events, setEvents] = useState<{ id: string; title: string; basePrice?: number }[]>([]);
  const [pricing, setPricing] = useState<Record<string, Tier>>({});

  const load = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    const list = data.events || [];
    setEvents(list);
    setPricing((prev) => {
      const next = { ...prev };
      list.forEach((e: { id: string; basePrice?: number }) => {
        if (!next[e.id]) {
          const base = e.basePrice || 1000;
          next[e.id] = { silver: base, gold: base + 300, vip: base + 900 };
        }
      });
      return next;
    });
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
      <table className="admin-table">
        <thead><tr><th>Event</th><th>Silver</th><th>Gold</th><th>VIP</th><th>Action</th></tr></thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.title}</td>
              <td><input className="input" type="number" value={pricing[event.id].silver} onChange={(e) => update(event.id, 'silver', Number(e.target.value))} /></td>
              <td><input className="input" type="number" value={pricing[event.id].gold} onChange={(e) => update(event.id, 'gold', Number(e.target.value))} /></td>
              <td><input className="input" type="number" value={pricing[event.id].vip} onChange={(e) => update(event.id, 'vip', Number(e.target.value))} /></td>
              <td><button className="btn" onClick={async () => {
                await fetch('/api/events', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'update', eventId: event.id, updates: { basePrice: pricing[event.id].silver, pricingTiers: pricing[event.id] } })
                });
                await load();
              }}>Update Pricing</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
