'use client';

import { useEffect, useState } from 'react';
import { getActiveUser } from '@/lib/clientStore';
import { formatDateTime } from '@/lib/format';

type BookingItem = {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  seats: string[];
  totalAmount: number;
  status: string;
  createdAt: number;
  qr?: string;
  cancellable?: boolean;
  s3Assets?: { ticketPdfUrl: string; qrImageUrl: string; invoiceUrl: string; logsUrl: string };
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = getActiveUser();
    if (!user) {
      setLoading(false);
      setBookings([]);
      return;
    }

    let cancelled = false;
    const loadBookings = async () => {
      try {
        const response = await fetch(`/api/bookings?userId=${encodeURIComponent(user.id)}`);
        const data = await response.json();
        if (!cancelled && response.ok) {
          const serverBookings = Array.isArray(data.bookings) ? (data.bookings as BookingItem[]) : [];
          setBookings(serverBookings.sort((a, b) => b.createdAt - a.createdAt));
        }
      } catch {
        if (!cancelled) {
          setMessage('Unable to load bookings right now. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadBookings();
    const timer = setInterval(() => {
      void loadBookings();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const cancel = async (bookingId: string) => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', bookingId })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to cancel booking.');
      return;
    }

    setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? { ...booking, status: 'CANCELLED' } : booking)));
  };

  return (
    <section className="bookings-dashboard">
      <header className="bookings-header">
        <h1>My Bookings</h1>
      </header>

      {message && <p>{message}</p>}

      {loading ? (
        <article className="booking-card">
          <p>Loading bookings...</p>
        </article>
      ) : bookings.length === 0 ? (
        <article className="booking-card">
          <p>No bookings yet.</p>
        </article>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            return (
              <article key={booking.id} className="booking-card">
                <h3>{booking.eventTitle}</h3>

                <p>
                  Status:{' '}
                  <span className={isConfirmed ? 'status-confirmed' : 'status-cancelled'}>
                    {booking.status}
                  </span>
                </p>
                <p>Seats: {booking.seats.join(', ')}</p>
                <p>Amount: ₹{booking.totalAmount}</p>
                <p>{formatDateTime(booking.createdAt)}</p>

                {booking.qr && (
                  <a className="btn booking-cta" href={booking.qr} download={`${booking.id}.png`}>
                    Download ticket QR
                  </a>
                )}

                {booking.s3Assets && (
                  <div className="asset-links">
                    <a href={booking.s3Assets.ticketPdfUrl} target="_blank" rel="noreferrer">
                      Ticket PDF
                    </a>
                    <a href={booking.s3Assets.qrImageUrl} target="_blank" rel="noreferrer">
                      QR Image
                    </a>
                    <a href={booking.s3Assets.invoiceUrl} target="_blank" rel="noreferrer">
                      Invoice
                    </a>
                    <a href={booking.s3Assets.logsUrl} target="_blank" rel="noreferrer">
                      QR data JSON
                    </a>
                  </div>
                )}

                {booking.status === 'CONFIRMED' && booking.cancellable !== false && (
                  <button className="cancel-link" onClick={() => void cancel(booking.id)}>
                    Cancel booking
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}