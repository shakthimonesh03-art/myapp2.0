'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { events } from '@/lib/mockData';
import { getActiveUser, pushNotification, saveBooking } from '@/lib/clientStore';
import { buildS3Url } from '@/lib/s3Config';

type Hold = { seats: string[]; expiresAt: number; amount: number };

function pseudoQrDataUrl(payload: string): string {
  const bytes = Array.from(payload).map((char) => char.charCodeAt(0));
  const size = 21;
  let squares = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (x * 7 + y * 13) % bytes.length;
      const on = (bytes[idx] + x + y) % 2 === 0;
      if (on) squares += `<rect x="${x}" y="${y}" width="1" height="1" fill="black" />`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="210" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/>${squares}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isValidUpi(upi: string) {
  return /^[\w.-]{2,}@[\w.-]{2,}$/.test(upi);
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const [hold, setHold] = useState<Hold | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [ticket, setTicket] = useState<{ bookingId: string; qr: string } | null>(null);
  const [upiId, setUpiId] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');

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
    const user = getActiveUser();
    if (!user) {
      alert('Please login/signup first.');
      router.push('/auth');
      return;
    }

    if (!isValidUpi(upiId)) {
      setPaymentMessage('Enter valid UPI ID (example: name@bank).');
      return;
    }

    const bookingId = `BKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const idempotencyKey = `IDEMP-${bookingId}`;

    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, amount: hold.amount, status: 'SUCCESS', idempotencyKey, upiId, provider: 'RAZORPAY_UPI' })
    });

    const qrPayload = JSON.stringify({ bookingId, eventId: id, seats: hold.seats, ts: Date.now(), upiId });
    const qr = pseudoQrDataUrl(qrPayload);
    const ticketPdfUrl = buildS3Url('ticketPdf', `${bookingId}.pdf`);
    const qrImageUrl = buildS3Url('qrImage', `${bookingId}.svg`);
    const invoiceUrl = buildS3Url('invoice', `${bookingId}.pdf`);
    const logsUrl = buildS3Url('logArchive', `${bookingId}.json`);

    saveBooking({
      id: bookingId,
      eventId: id,
      eventTitle: event.title,
      seats: hold.seats,
      amount: hold.amount,
      status: 'CONFIRMED',
      qr,
      createdAt: Date.now(),
      cancellable: true,
      s3Assets: { ticketPdfUrl, qrImageUrl, invoiceUrl, logsUrl }
    });
    pushNotification(`Booking ${bookingId} confirmed for ${event.title}`, 'EMAIL');
    pushNotification(`Seat confirmation for ${event.title} (${hold.seats.join(', ')})`, 'SMS');
    pushNotification(`Your QR ticket ${bookingId} is ready to download`, 'PUSH');
    setPaymentMessage('Razorpay UPI payment successful. Booking confirmed!');
    setTicket({ bookingId, qr });
    localStorage.removeItem(`hold:${id}`);
  };

  if (!event) return <p>Event not found.</p>;

  if (!hold && !ticket) {
    return (
      <section className="panel stack-xl">
        <h2>No active hold found</h2>
        <button className="btn" onClick={() => router.push(`/events/${id}`)}>Go back to seats</button>
      </section>
    );
  }

  return (
    <section className="stack-xl">
      <div className="panel">
        <h2>{event.title}</h2>
        {ticket ? (
          <>
            <p>Booking confirmed: <strong>{ticket.bookingId}</strong></p>
            <Image src={ticket.qr} alt="Ticket QR code" width={240} height={240} className="qr" unoptimized />
            <div className="row gap-sm wrap">
              <a className="btn" href={ticket.qr} download={`${ticket.bookingId}.svg`}>Download QR ticket</a>
              <button className="btn ghost" onClick={() => router.push('/bookings')}>Go to my bookings</button>
            </div>
          </>
        ) : (
          <>
            <p>Seats: {hold?.seats.join(', ')}</p>
            <p>Total: ₹{hold?.amount}</p>
            <p className="muted">Hold expires in {mmss}</p>

            <div className="razorpay-box stack">
              <h3>Pay with Razorpay UPI</h3>
              <p className="muted">Supported apps: GPay, PhonePe, Paytm, BHIM</p>
              <input
                className="input"
                placeholder="yourname@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
              />
              <button className="btn" onClick={payNow}>Pay ₹{hold?.amount} via UPI</button>
              {paymentMessage && <p>{paymentMessage}</p>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
