'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/format';
import { events } from '@/lib/mockData';
import { getActiveUser } from '@/lib/clientStore';

type SeatView = {
  id: string;
  label: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  price: number;
  ownedByRequester?: boolean;
};
type HoldSession = { holdToken: string; expiresAt: number };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const [seats, setSeats] = useState<SeatView[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [holdSession, setHoldSession] = useState<HoldSession | null>(null);
  const [message, setMessage] = useState('');
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [updatingHold, setUpdatingHold] = useState(false);

  useEffect(() => {
    if (!id) return;
    const holdKey = `hold:${id}`;
    const user = getActiveUser();

    if (user) {
      const raw = localStorage.getItem(holdKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            holdToken?: string;
            userId?: string;
            expiresAt?: number;
            seats?: string[];
          };
          if (parsed.holdToken && parsed.userId === user.id && Number.isFinite(parsed.expiresAt)) {
            setHoldSession({ holdToken: parsed.holdToken, expiresAt: Number(parsed.expiresAt) });
            if (Array.isArray(parsed.seats)) {
              setSelected(parsed.seats.map((seat) => String(seat).trim().toUpperCase()).filter(Boolean));
            }
          } else {
            localStorage.removeItem(holdKey);
          }
        } catch {
          localStorage.removeItem(holdKey);
        }
      }
    }

    let cancelled = false;
    const loadSeats = async () => {
      try {
        const query = user?.id
          ? `/api/inventory?eventId=${encodeURIComponent(id)}&userId=${encodeURIComponent(user.id)}`
          : `/api/inventory?eventId=${encodeURIComponent(id)}`;
        const response = await fetch(query);
        const data = await response.json();
        if (!cancelled && response.ok) {
          const serverSeats = Array.isArray(data.seats) ? (data.seats as SeatView[]) : [];
          setSeats(serverSeats);
          if (user?.id) {
            const heldByUser = serverSeats
              .filter((seat) => seat.status === 'HELD' && seat.ownedByRequester)
              .map((seat) => seat.id);
            setSelected(heldByUser);
            if (!heldByUser.length) {
              setHoldSession(null);
              localStorage.removeItem(holdKey);
            }
          } else {
            setSelected([]);
            setHoldSession(null);
          }
          setMessage('');
        }
      } catch {
        if (!cancelled) setMessage('Unable to load seat status right now.');
      } finally {
        if (!cancelled) setLoadingSeats(false);
      }
    };

    loadSeats();
    const timer = setInterval(loadSeats, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  if (!event) return <p>Event not found.</p>;

  const selectedSet = new Set(selected);
  const total = seats.filter((seat) => selectedSet.has(seat.id)).reduce((sum, seat) => sum + seat.price, 0);

  const toggleSeat = async (seatId: string) => {
    if (updatingHold) return;
    const user = getActiveUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const seat = seats.find((item) => item.id === seatId);
    if (!seat) return;
    const heldByRequester = seat.status === 'HELD' && seat.ownedByRequester;
    const blockedForSelection = seat.status === 'BOOKED' || seat.status === 'BLOCKED' || (seat.status === 'HELD' && !heldByRequester);
    if (blockedForSelection) return;

    const nextSelected = selected.includes(seatId) ? selected.filter((s) => s !== seatId) : [...selected, seatId];
    setUpdatingHold(true);
    setMessage('');

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh-hold',
          eventId: id,
          userId: user.id,
          holdToken: holdSession?.holdToken || '',
          seatIds: nextSelected
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Unable to update seat selection. Please try again.');
        return;
      }

      const holdKey = `hold:${id}`;
      if (!nextSelected.length) {
        setSelected([]);
        setHoldSession(null);
        localStorage.removeItem(holdKey);
        return;
      }

      const nextSeats = Array.isArray(data.seats) ? (data.seats as string[]) : nextSelected;
      const normalizedSeats = nextSeats.map((value) => String(value).trim().toUpperCase()).filter(Boolean);
      const expiresAt = Number(data.expiry);
      const token = typeof data.holdToken === 'string' ? data.holdToken : holdSession?.holdToken;
      if (!token || !Number.isFinite(expiresAt)) {
        setMessage('Seat hold response was incomplete. Please try again.');
        return;
      }

      const nextTotal = seats.filter((item) => normalizedSeats.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
      setSelected(normalizedSeats);
      setHoldSession({ holdToken: token, expiresAt });
      localStorage.setItem(
        holdKey,
        JSON.stringify({
          eventId: id,
          seats: normalizedSeats,
          holdToken: token,
          userId: user.id,
          expiresAt,
          amount: nextTotal
        })
      );
    } finally {
      setUpdatingHold(false);
    }
  };

  const goToCheckout = () => {
    if (!selected.length) return;
    const user = getActiveUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!holdSession) {
      setMessage('Hold not found for selected seats. Please select seats again.');
      return;
    }

    const holdKey = `hold:${id}`;
    localStorage.setItem(
      holdKey,
      JSON.stringify({
        eventId: id,
        seats: selected,
        holdToken: holdSession.holdToken,
        userId: user.id,
        expiresAt: holdSession.expiresAt,
        amount: total
      })
    );
    router.push(`/booking/${id}`);
  };

  return (
    <section className="stack-xl">
      <div className="panel hero-mini">
        <div className="event-detail-image">
          <img src={event.imageUrl} alt={`${event.title} banner`} referrerPolicy="no-referrer" />
        </div>
        <h1>{event.title}</h1>
        <p>
          {event.venue} • {event.city} • {formatDateTime(event.datetime)}
        </p>
        <p>{event.venueLayout}</p>
      </div>

      <div className="panel">
        <div className="row between center wrap">
          <h3>Venue seat layout</h3>
          <p className="muted">Gray = unavailable • Blue = selected</p>
        </div>
        {loadingSeats ? (
          <p>Loading seats...</p>
        ) : (
          <div className="seats">
            {seats.map((seat) => {
              const isSelected = selected.includes(seat.id);
              const heldByRequester = seat.status === 'HELD' && seat.ownedByRequester;
              const disabled = updatingHold || seat.status === 'BOOKED' || seat.status === 'BLOCKED' || (seat.status === 'HELD' && !heldByRequester);
              return (
                <button key={seat.id} className={`seat ${isSelected ? 'active' : ''}`} disabled={disabled} onClick={() => void toggleSeat(seat.id)}>
                  {seat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel row between center wrap">
        <p>
          {selected.length} seats • ₹{total}
        </p>
        <button className="btn" onClick={goToCheckout} disabled={!selected.length || !holdSession || updatingHold}>
          Submit
        </button>
      </div>
      {message && <p>{message}</p>}
    </section>
  );
}
