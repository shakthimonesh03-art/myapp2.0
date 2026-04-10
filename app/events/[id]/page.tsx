'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/format';
import { getActiveUser } from '@/lib/clientStore';

const HOLD_MINUTES = 5;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<{ id: string; title: string; city: string; startTime: string; venueId: string; description: string; basePrice?: number } | null>(null);
  const [venueName, setVenueName] = useState('');
  const [seats, setSeats] = useState<{ id: string; seatNumber?: string; status: string; price?: number; holdExpiry?: number }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [eventRes, venuesRes, seatsRes] = await Promise.all([fetch(`/api/events/${id}`), fetch('/api/venues'), fetch(`/api/inventory?eventId=${id}`)]);
      const eventData = await eventRes.json();
      const venuesData = await venuesRes.json();
      const seatsData = await seatsRes.json();
      const eventItem = eventData.event || null;
      setEvent(eventItem);
      setSeats(seatsData.seats ?? []);
      setVenueName((venuesData.venues || []).find((v: { id: string }) => v.id === eventItem?.venueId)?.name || eventItem?.venueId || '');
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [id]);

  const total = useMemo(() => {
    if (!event) return 0;
    const selectedSeats = seats.filter((seat) => selected.includes(seat.id));
    if (!selectedSeats.length) return selected.length * (event.basePrice || 1200);
    return selectedSeats.reduce((sum, seat) => sum + (seat.price ?? (event.basePrice || 1200)), 0);
  }, [selected, seats, event]);

  if (!event) return <p>Event not found.</p>;

  const toggleSeat = (seatId: string) => {
    setSelected((prev) => prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]);
  };

  const holdSeats = async () => {
    const user = getActiveUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!selected.length) return;
    setError('');
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hold', eventId: id, seatIds: selected, userId: user.id })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to hold seats.');
      return;
    }
    localStorage.setItem(`hold:${id}`, JSON.stringify({ seats: data.seats, expiresAt: data.expiry, amount: total, holdToken: data.holdToken, userId: user.id }));
    router.push(`/booking/${id}`);
  };

  return (
    <section className="stack-xl">
      <div className="panel hero-mini">
        <h1>{event.title}</h1>
        <p>{venueName} • {event.city} • {formatDateTime(event.startTime)}</p>
        <p>{event.description}</p>
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
                {seat.seatNumber || seat.id}
              </button>
            );
          })}
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="panel row between center wrap">
        <p>{selected.length} seats • ₹{total}</p>
        <button className="btn" onClick={holdSeats}>Hold for {HOLD_MINUTES} min</button>
      </div>
    </section>
  );
}
