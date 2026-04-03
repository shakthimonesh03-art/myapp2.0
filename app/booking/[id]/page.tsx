'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { events } from '@/lib/mockData';

type Hold = { seats: string[]; expiresAt: number; amount: number };

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const [hold, setHold] = useState<Hold | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [ticket, setTicket] = useState<{ bookingId: string; qr: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`hold:${id}`);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Hold;
    setHold(parsed);
  }, [id]);

  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const ms = hold.expiresAt - Date.now();
      if (ms <= 0) {
        localStorage.removeItem(`hold:${id}`);
        setHold(null);
        setRemaining(0);
        return;
      }
      setRemaining(Math.floor(ms / 1000));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold, id]);

  const mmss = useMemo(() => `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`, [remaining]);

  const payNow = async () => {
    if (!hold || !event) return;
    const bookingId = `BKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const qrPayload = JSON.stringify({ bookingId, eventId: id, seats: hold.seats, ts: Date.now() });
    const qr = await QRCode.toDataURL(qrPayload);
    setTicket({ bookingId, qr });
    localStorage.removeItem(`hold:${id}`);
  };

  if (!event) return <p>Event not found.</p>;

  if (!hold && !ticket) {
    return (
      <section className="card stack">
        <h2>No active hold found</h2>
        <button className="btn" onClick={() => router.push(`/events/${id}`)}>Go back to seats</button>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="card">
        <h2>{event.title}</h2>
        {ticket ? (
          <>
            <p>Booking confirmed: <strong>{ticket.bookingId}</strong></p>
            <img src={ticket.qr} alt="Ticket QR code" className="qr" />
            <p>Downloadable QR ticket generated. (Prototype mode)</p>
          </>
        ) : (
          <>
            <p>Seats: {hold?.seats.join(', ')}</p>
            <p>Total: ₹{hold?.amount}</p>
            <p className="warning">Hold expires in {mmss}</p>
            <button className="btn" onClick={payNow}>Pay now (mock)</button>
          </>
        )}
      </div>
    </section>
  );
}
