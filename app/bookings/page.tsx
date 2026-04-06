'use client';

import { useEffect, useState } from 'react';
import { cancelBooking, getBookings } from '@/lib/clientStore';
<<<<<<< HEAD
import { formatDateTime } from '@/lib/format';
=======
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
        </div>
      )}
    </section>
  );
}
