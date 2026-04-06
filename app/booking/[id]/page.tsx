'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { getActiveUser, pushNotification, saveBooking } from '@/lib/clientStore';
import { buildS3Url } from '@/lib/s3Config';

type Hold = { seats: string[]; expiresAt: number; amount: number; holdToken: string; userId: string };

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
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="210" height="210" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/>${squares}</svg>`)}`;
}

function isValidUpi(upi: string) {
  return /^[\w.-]{2,}@[\w.-]{2,}$/.test(upi);
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<{ id: string; title: string } | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [ticket, setTicket] = useState<{ bookingId: string; qr: string } | null>(null);
  const [upiId, setUpiId] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(`hold:${id}`);
    if (raw) setHold(JSON.parse(raw) as Hold);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      const eventRes = await fetch(`/api/events/${id}`);
      const data = await eventRes.json();
      setEvent(data.event || null);
    };
    load();
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
    if (!user) return router.push('/auth');
    if (hold.userId !== user.id) {
      setPaymentMessage('This hold belongs to another account. Please select seats again.');
      return;
    }
    if (!isValidUpi(upiId)) return setPaymentMessage('Enter valid UPI ID (example: name@bank).');

    const bookingId = `BKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const paymentResponse = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, amount: hold.amount, status: 'SUCCESS', idempotencyKey: `IDEMP-${bookingId}`, upiId, provider: 'RAZORPAY_UPI' })
    });
    if (!paymentResponse.ok) {
      setPaymentMessage('Payment failed. Please try again.');
      return;
    }

    const bookingResponse = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', userId: user.id, eventId: id, seats: hold.seats, totalAmount: hold.amount })
    });
    if (!bookingResponse.ok) {
      setPaymentMessage('Could not create booking.');
      return;
    }

    const inventoryBookResponse = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'book', eventId: id, seatIds: hold.seats, holdToken: hold.holdToken, userId: user.id })
    });
    if (!inventoryBookResponse.ok) {
      setPaymentMessage('Seat booking failed. Payment will be reconciled.');
      return;
    }

    const qr = pseudoQrDataUrl(JSON.stringify({ bookingId, eventId: id, seats: hold.seats, upiId, ts: Date.now() }));
    const qrSvg = decodeURIComponent(qr.replace('data:image/svg+xml;utf8,', ''));

    const uploadResponse = await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload-ticket', bookingId, eventTitle: event.title, seats: hold.seats, amount: hold.amount, qrSvg })
    });
    const uploadData = await uploadResponse.json();

    saveBooking({
      id: bookingId,
      userId: user.id,
      userEmail: user.email,
      eventId: id,
      eventTitle: event.title,
      seats: hold.seats,
      amount: hold.amount,
      status: 'CONFIRMED',
      qr,
      createdAt: Date.now(),
      cancellable: true,
      s3Assets: {
        ticketPdfUrl: uploadData.ticketPdfUrl || buildS3Url('ticketPdf', `${bookingId}.pdf`),
        qrImageUrl: uploadData.qrUrl || buildS3Url('qrImage', `${bookingId}.svg`),
        invoiceUrl: uploadData.invoiceUrl || buildS3Url('invoice', `${bookingId}.pdf`),
        logsUrl: uploadData.logsUrl || buildS3Url('logArchive', `${bookingId}.json`)
      }
    });

    pushNotification(`Booking ${bookingId} confirmed`, 'EMAIL');
    pushNotification(`UPI payment success for ${bookingId}`, 'PUSH');
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        type: 'booking_confirmed',
        channel: 'EMAIL',
        recipientEmail: user.email,
        payload: { bookingId, eventId: id, seats: hold.seats, amount: hold.amount }
      })
    });
    setPaymentMessage('Razorpay UPI payment successful.');
    setTicket({ bookingId, qr });
    localStorage.removeItem(`hold:${id}`);
  };

  if (!event) return <p>Event not found.</p>;

  return (
    <section className="modern-page stack-xl">
      <div className="modern-header">
        <h1>Checkout</h1>
        <p>Secure booking with Razorpay UPI for {event.title}</p>
      </div>

      <div className="modern-card stack">
        {ticket ? (
          <>
            <h3>Booking confirmed: {ticket.bookingId}</h3>
            <Image src={ticket.qr} alt="Ticket QR code" width={240} height={240} className="qr" unoptimized />
            <div className="row gap-sm wrap">
              <a className="btn" href={ticket.qr} download={`${ticket.bookingId}.svg`}>Download QR ticket</a>
              <button className="btn ghost" onClick={() => router.push('/bookings')}>My bookings</button>
            </div>
          </>
        ) : hold ? (
          <>
            <p>Seats: {hold.seats.join(', ')} • Total: ₹{hold.amount}</p>
            <p className="muted">Hold expires in {mmss}</p>
            <div className="razorpay-box stack">
              <h3>Razorpay UPI</h3>
              <input className="input" placeholder="yourname@okaxis" value={upiId} onChange={(e) => setUpiId(e.target.value.trim())} />
              <button className="btn" onClick={payNow}>Pay ₹{hold.amount} via UPI</button>
              {paymentMessage && <p>{paymentMessage}</p>}
            </div>
          </>
        ) : (
          <button className="btn" onClick={() => router.push(`/events/${id}`)}>Return to seat map</button>
        )}
      </div>
    </section>
  );
}
