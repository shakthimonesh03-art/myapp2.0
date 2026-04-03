'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { events, seatLayout } from '@/lib/mockData';

const HOLD_MINUTES = 5;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const seats = useMemo(() => seatLayout[id] ?? [], [id]);
  const [selected, setSelected] = useState<string[]>([]);

  if (!event) {
    return <p>Event not found.</p>;
  }

  const total = selected.length * event.basePrice;

  const toggleSeat = (seatId: string) => {
    setSelected((prev) => prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]);
  };

  const holdSeats = () => {
    if (!selected.length) return;
    const expiresAt = Date.now() + HOLD_MINUTES * 60 * 1000;
    localStorage.setItem(`hold:${id}`, JSON.stringify({ seats: selected, expiresAt, amount: total }));
    router.push(`/booking/${id}`);
  };

  return (
    <section className="stack">
      <div className="hero small">
        <h1>{event.title}</h1>
        <p>{event.venue} • {event.city} • {new Date(event.datetime).toLocaleString()}</p>
      </div>

      <div className="card">
        <h3>Select seats</h3>
        <div className="seats">
          {seats.map((seat) => {
            const isSelected = selected.includes(seat.id);
            const disabled = seat.status !== 'AVAILABLE';
            return (
              <button
                key={seat.id}
                className={`seat ${isSelected ? 'active' : ''}`}
                disabled={disabled}
                onClick={() => toggleSeat(seat.id)}
              >
                {seat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card row between center">
        <p>{selected.length} seats • ₹{total}</p>
        <button className="btn" onClick={holdSeats}>Hold for {HOLD_MINUTES} min & continue</button>
      </div>
    </section>
  );
}
