import crypto from 'node:crypto';
import { appState, createId, json, saveState } from '@/lib/serviceState';

const RAZORPAY_ORDERS_ENDPOINT = 'https://api.razorpay.com/v1/orders';

type BookingStatus = 'PAYMENT_IN_PROGRESS' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

function getRazorpayConfig() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  return { keyId, keySecret };
}

function assertRazorpayConfigured() {
  const { keyId, keySecret } = getRazorpayConfig();
  if (!keyId || !keySecret) {
    return { ok: false as const, error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.' };
  }
  return { ok: true as const, keyId, keySecret };
}

function uniqueSeatIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((value) => (typeof value === 'string' ? value.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  );
}

function releaseExpiredHolds(eventId: string) {
  const seats = appState.seats[eventId] || [];
  const now = Date.now();
  let changed = false;
  seats.forEach((seat) => {
    if (seat.status === 'HELD' && seat.holdExpiry <= now) {
      seat.status = 'AVAILABLE';
      seat.holdToken = '';
      seat.holdExpiry = 0;
      seat.holdUserId = '';
      changed = true;
    }
  });
  if (changed) saveState();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'checkout-config') {
    const config = assertRazorpayConfigured();
    if (!config.ok) return json({ error: config.error }, 500);
    return json({ keyId: config.keyId });
  }

  return json({ error: 'Unsupported action' }, 400);
}

export async function POST(req: Request) {
  const body = await req.json();
  const config = assertRazorpayConfigured();
  if (!config.ok) return json({ error: config.error }, 500);

  if (body.action === 'create-order') {
    const { userId, eventId, eventTitle, holdToken, seatIds, amount } = body;
    if (!userId || !eventId || !eventTitle || !holdToken || !seatIds || !amount) {
      return json({ error: 'Missing required fields for creating an order.' }, 400);
    }

    const seats = appState.seats[eventId];
    if (!seats) return json({ error: 'Invalid event for booking.' }, 400);

    releaseExpiredHolds(eventId);
    const selected = seats.filter((seat) => seatIds.includes(seat.id));
    if (selected.length !== seatIds.length) return json({ error: 'One or more seats are invalid.' }, 400);

    const seatsInvalid = selected.some(
      (seat) => seat.status !== 'HELD' || seat.holdToken !== holdToken || seat.holdUserId !== userId || seat.holdExpiry <= Date.now()
    );
    if (seatsInvalid) return json({ error: 'Selected seats are no longer held for this user. Please select seats again.' }, 409);

    // Check for existing bookings for these seats to prevent duplicates
    const existingBooking = appState.bookings.find((b) => {
      if (b.eventId !== eventId || ['FAILED', 'CANCELLED', 'EXPIRED'].includes(b.status)) {
        return false;
      }
      const hasOverlappingSeats = b.seats.some((seatId) => seatIds.includes(seatId));
      if (!hasOverlappingSeats) {
        return false;
      }
      // If a confirmed booking exists, it's a duplicate.
      if (b.status === 'CONFIRMED') {
        return true;
      }
      // If a payment is in progress and recent (e.g., within 10 mins), block a new one.
      if (b.status === 'PAYMENT_IN_PROGRESS' && Date.now() - b.updatedAt < 10 * 60 * 1000) {
        return true;
      }
      return false;
    });

    if (existingBooking) {
      return json({ error: 'These seats are already part of an existing booking or pending payment. Please select different seats.' }, 409);
    }

    const booking = {
      id: createId('bk'),
      userId,
      eventId,
      eventTitle,
      seats: seatIds,
      holdToken,
      totalAmount: amount,
      status: 'PAYMENT_IN_PROGRESS' as BookingStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cancellable: true
    };
    appState.bookings.push(booking);

    selected.forEach((seat) => {
      seat.status = 'BOOKED';
      seat.holdToken = '';
      seat.holdExpiry = 0;
      seat.holdUserId = '';
    });
    saveState();

    const amountPaise = Math.round(amount * 100);
    const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');

    const response = await fetch(RAZORPAY_ORDERS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: booking.id,
        notes: { bookingId: booking.id, eventId, userId }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      booking.status = 'FAILED';
      saveState();
      const message = data?.error?.description || data?.error?.reason || 'Failed to create Razorpay order.';
      return json({ error: message }, 502);
    }

    return json({
      keyId: config.keyId,
      orderId: data.id,
      bookingId: booking.id,
      amount: data.amount,
      currency: data.currency
    });
  }

  if (body.action === 'verify-payment') {
    const { bookingId, orderId, paymentId, signature } = body;
    if (!bookingId || !orderId || !paymentId || !signature) {
      return json({ error: 'Missing fields for verifying payment.' }, 400);
    }

    const booking = appState.bookings.find((item) => item.id === bookingId);
    if (!booking) return json({ error: 'Booking not found.' }, 404);

    const generatedSignature = crypto
      .createHmac('sha256', config.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      booking.status = 'FAILED';
      saveState();
      return json({ error: 'Invalid Razorpay signature.' }, 400);
    }

    const payment = {
      id: createId('pay'),
      bookingId,
      provider: 'RAZORPAY',
      providerRef: paymentId,
      status: 'SUCCESS',
      amount: booking.totalAmount,
      createdAt: Date.now()
    };
    appState.payments.push(payment);

    booking.status = 'CONFIRMED';
    booking.updatedAt = Date.now();
    saveState();

    return json({ payment, booking, confirmedSeats: booking.seats });
  }

  if (body.action === 'mark-failed') {
    const booking = appState.bookings.find((item) => item.id === body.bookingId);
    if (booking && booking.status !== 'CONFIRMED') {
      booking.status = 'FAILED';
      booking.updatedAt = Date.now();
      saveState();
    }
    return json({ booking });
  }

  return json({ error: 'Unsupported action' }, 400);
}