'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/format';
import { events, seatLayout } from '@/lib/mockData';

const HOLD_MINUTES = 5;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const seats = useMemo(() => seatLayout[id] ?? [], [id]);
  const [selected, setSelected] = useState<string[]>([]);

  if (!event) return <p>Event not found.</p>;

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
    <section className="stack-xl">
      <div className="panel hero-mini">
        <h1>{event.title}</h1>
        <p>{event.venue} • {event.city} • {formatDateTime(event.datetime)}</p>
        <p>{event.venueLayout}</p>
      </div>

      <div className="panel">
        <div className="row between center wrap">
          <h3>Venue seat layout</h3>
          <p className="muted">Gray = unavailable • Blue = selected</p>
        </div>
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

      <div className="panel row between center wrap">
        <p>{selected.length} seats • ₹{total}</p>
        <button className="btn" onClick={holdSeats}>Hold for {HOLD_MINUTES} min</button>
      </div>
    </section>
  );
}
