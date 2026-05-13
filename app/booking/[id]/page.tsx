'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { events } from '@/lib/mockData';
import { getActiveUser } from '@/lib/clientStore';
import { buildS3Url } from '@/lib/s3Config';

type Hold = { eventId: string; seats: string[]; holdToken: string; userId: string; expiresAt: number; amount: number };

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

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

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const [hold, setHold] = useState<Hold | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [ticket, setTicket] = useState<{ bookingId: string; qr: string } | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const user = getActiveUser();
    if (!user) {
      router.replace('/auth');
      return;
    }

    const raw = localStorage.getItem(`hold:${id}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Hold>;
        if (parsed.holdToken && Array.isArray(parsed.seats) && parsed.seats.length) {
          const holdUserId = typeof parsed.userId === 'string' && parsed.userId.trim() ? parsed.userId : user.id;
          const normalizedSeats = parsed.seats.map((seat) => String(seat).trim().toUpperCase()).filter(Boolean);
          const parsedAmount = Number(parsed.amount);
          if (holdUserId !== user.id || !normalizedSeats.length || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            localStorage.removeItem(`hold:${id}`);
          } else {
            setHold({
              eventId: id,
              seats: normalizedSeats,
              holdToken: parsed.holdToken,
              userId: holdUserId,
              expiresAt: Number(parsed.expiresAt) || Date.now(),
              amount: parsedAmount
            });
          }
        } else {
          localStorage.removeItem(`hold:${id}`);
        }
      } catch {
        localStorage.removeItem(`hold:${id}`);
      }
    }
    setAuthChecked(true);
  }, [id, router]);

  useEffect(() => {
    if (!hold) return;
    const tick = async () => {
      const ms = hold.expiresAt - Date.now();
      if (ms <= 0) {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'release', eventId: id, holdToken: hold.holdToken, userId: hold.userId })
        });
        localStorage.removeItem(`hold:${id}`);
        setHold(null);
        setRemaining(0);
        return;
      }
      setRemaining(Math.floor(ms / 1000));
    };
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [hold, id]);

  const mmss = useMemo(() => `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`, [remaining]);

  const payNow = async () => {
    if (!hold || !event || paying) return;
    const user = getActiveUser();
    if (!user) return router.push('/auth');

    setPaying(true);
    setPaymentMessage('');

    try {
      const orderResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          userId: user.id,
          eventId: id,
          eventTitle: event.title,
          holdToken: hold.holdToken,
          seatIds: hold.seats,
          amount: hold.amount
        })
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error || 'Unable to create Razorpay order.');

      const { bookingId } = orderData;
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) throw new Error('Razorpay checkout failed to load.');

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'TicketPulse',
        description: `${event.title} booking`,
        order_id: orderData.orderId,
        prefill: {
          name: user.name,
          email: user.email
        },
        theme: { color: '#5b21b6' },
        handler: async (response: RazorpaySuccessPayload) => {
          try {
            const verifyResponse = await fetch('/api/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'verify-payment',
                bookingId,
                orderId: response.razorpay_order_id || orderData.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verifyData.error || 'Payment verification failed.');

            const qr = pseudoQrDataUrl(
              JSON.stringify({
                bookingId,
                eventId: id,
                seats: hold.seats,
                paymentId: response.razorpay_payment_id,
                ts: Date.now()
              })
            );
            const qrSvg = decodeURIComponent(qr.replace('data:image/svg+xml;utf8,', ''));
            let s3Assets:
              | {
                  ticketPdfUrl: string;
                  qrImageUrl: string;
                  invoiceUrl: string;
                  logsUrl: string;
                }
              | undefined;

            try {
              const uploadResponse = await fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upload-ticket', bookingId, eventTitle: event.title, seats: hold.seats, amount: hold.amount, qrSvg })
              });
              const uploadData = await uploadResponse.json();
              if (uploadResponse.ok && uploadData.uploaded) {
                s3Assets = {
                  ticketPdfUrl: uploadData.ticketPdfUrl || buildS3Url('ticketPdf', `${bookingId}.pdf`),
                  qrImageUrl: uploadData.qrUrl || buildS3Url('qrImage', `${bookingId}.svg`),
                  invoiceUrl: uploadData.invoiceUrl || buildS3Url('invoice', `${bookingId}.pdf`),
                  logsUrl: uploadData.logsUrl || buildS3Url('logArchive', `${bookingId}.json`)
                };
              }
            } catch {
              // Keep payment success state even if upload fails.
            }

            await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'attach-assets',
                bookingId,
                qr,
                ...(s3Assets ? { s3Assets } : {})
              })
            });

            localStorage.removeItem(`hold:${id}`);
            setHold(null);
            setTicket({ bookingId, qr });
            setPaymentMessage('Payment successful. Booking confirmed.');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Payment failed during verification.';
            setPaymentMessage(message);
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await fetch('/api/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'mark-failed', bookingId })
            });
            setPaying(false);
            setPaymentMessage('Payment cancelled.');
          }
        }
      });

      rzp.on('payment.failed', async () => {
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-failed', bookingId })
        });
        setPaying(false);
        setPaymentMessage('Payment failed. Please try again.');
      });

      rzp.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment initialization failed.';
      setPaymentMessage(message);
      setPaying(false);
    }
  };

  if (!event) return <p>Event not found.</p>;
  if (!authChecked) return <p>Checking login...</p>;

  return (
    <section className="modern-page stack-xl">
      <div className="modern-header">
        <h1>Checkout</h1>
        <p>Secure booking with Razorpay for {event.title}</p>
      </div>

      <div className="modern-card stack">
        {ticket ? (
          <>
            <h3>Booking confirmed: {ticket.bookingId}</h3>
            <Image src={ticket.qr} alt="Ticket QR code" width={240} height={240} className="qr" unoptimized />
            <div className="row gap-sm wrap">
              <a className="btn" href={ticket.qr} download={`${ticket.bookingId}.svg`}>
                Download QR ticket
              </a>
              <button className="btn ghost" onClick={() => router.push('/bookings')}>
                My bookings
              </button>
            </div>
          </>
        ) : hold ? (
          <>
            <p>
              Seats: {hold.seats.join(', ')} • Total: ₹{hold.amount}
            </p>
            <p className="muted">Hold expires in {mmss}</p>
            <div className="razorpay-box stack">
              <h3>Razorpay Checkout</h3>
              <button className="btn" onClick={payNow} disabled={paying}>
                {paying ? 'Processing...' : `Pay ₹${hold.amount}`}
              </button>
              {paymentMessage && <p>{paymentMessage}</p>}
            </div>
          </>
        ) : (
          <button className="btn" onClick={() => router.push(`/events/${id}`)}>
            Return to seat map
          </button>
        )}
      </div>
    </section>
  );
}