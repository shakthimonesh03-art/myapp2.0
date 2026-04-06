'use client';

import { useEffect, useState } from 'react';
import { cancelBooking, getBookings } from '@/lib/clientStore';
import { formatDateTime } from '@/lib/format';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState(getBookings());

  useEffect(() => {
    setBookings(getBookings());
  }, []);

  const cancel = (id: string) => {
    cancelBooking(id);
    setBookings(getBookings());
  };

  return (
    <section className="bookings-dashboard">
      <header className="bookings-header">
        <h1>My Bookings</h1>
      </header>

      {bookings.length === 0 ? (
        <article className="booking-card"><p>No bookings yet.</p></article>
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
                <p>Amount: ₹{booking.amount}</p>
                <p>{formatDateTime(booking.createdAt)}</p>

                <a className="btn booking-cta" href={booking.qr} download={`${booking.id}.png`}>Download ticket QR</a>

                {booking.s3Assets && (
                  <div className="asset-links">
                    <a href={booking.s3Assets.ticketPdfUrl} target="_blank" rel="noreferrer">Ticket PDF</a>
                    <a href={booking.s3Assets.qrImageUrl} target="_blank" rel="noreferrer">QR Image</a>
                    <a href={booking.s3Assets.invoiceUrl} target="_blank" rel="noreferrer">Invoice</a>
                    <a href={booking.s3Assets.logsUrl} target="_blank" rel="noreferrer">QR data JSON</a>
                  </div>
                )}

                {booking.status === 'CONFIRMED' && booking.cancellable && (
                  <button className="cancel-link" onClick={() => cancel(booking.id)}>Cancel booking</button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
