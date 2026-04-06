'use client';

import { useEffect, useState } from 'react';
import { cancelBooking, getBookings } from '@/lib/clientStore';

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
    <section className="stack">
      <h1>My bookings</h1>
      {bookings.length === 0 ? <p className="card">No bookings yet.</p> : (
        <div className="grid">
          {bookings.map((booking) => (
            <article key={booking.id} className="card stack">
              <h3>{booking.eventTitle}</h3>
              <p>Status: <strong>{booking.status}</strong></p>
              <p>Seats: {booking.seats.join(', ')}</p>
              <p>Amount: ₹{booking.amount}</p>
              <p>{new Date(booking.createdAt).toLocaleString()}</p>
              <a className="btn" href={booking.qr} download={`${booking.id}.png`}>Download ticket QR</a>

              {booking.s3Assets && (
                <div className="stack">
                  <small>S3 ticket PDF: {booking.s3Assets.ticketPdfUrl}</small>
                  <small>S3 QR image: {booking.s3Assets.qrImageUrl}</small>
                  <small>S3 invoice: {booking.s3Assets.invoiceUrl}</small>
                  <small>S3 log archive: {booking.s3Assets.logsUrl}</small>
                </div>
              )}
              {booking.status === 'CONFIRMED' && booking.cancellable && (
                <button className="btn ghost" onClick={() => cancel(booking.id)}>Cancel booking</button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
