'use client';

import { useState } from 'react';
import { events } from '@/lib/mockData';

type Tier = { silver: number; gold: number; vip: number };

export function PricingComponent() {
  const [pricing, setPricing] = useState<Record<string, Tier>>(() =>
    Object.fromEntries(events.map((e) => [e.id, { silver: e.basePrice, gold: e.basePrice + 300, vip: e.basePrice + 900 }]))
  );

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
              <td><button className="btn">Update Pricing</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
