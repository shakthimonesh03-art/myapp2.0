import { createId, json, serviceState } from '@/lib/serviceState';
import { persistServiceState } from '@/lib/serviceState';
import { publishKafkaEvent } from '@/lib/kafka';
import { publishSnsNotification } from '@/lib/aws';

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const admin = searchParams.get('admin') === '1';
  const bookings = admin ? serviceState.bookings : userId ? serviceState.bookings.filter((booking) => booking.userId === userId) : [];
  return json({ bookings });
}

export async function POST(req: Request) {
  try {
  const body = await req.json();
  if (body.action === 'create') {
    const duplicate = serviceState.bookings.find((item) =>
      item.userId === body.userId
      && item.eventId === body.eventId
      && item.status !== 'CANCELLED'
      && JSON.stringify([...item.seats].sort()) === JSON.stringify([...(body.seats ?? [])].sort())
    );
    if (duplicate) return json({ error: 'Duplicate booking exists for this user and seat selection' }, 409);
    const booking = { id: createId('bkg'), userId: body.userId, eventId: body.eventId, seats: body.seats, totalAmount: body.totalAmount, status: 'PENDING' as const, createdAt: Date.now() };
    serviceState.bookings.push(booking);
    persistServiceState('bookings.create', { bookingId: booking.id });
    return json({ booking }, 201);
  }
  if (body.action === 'status') {
    const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    booking.status = body.status;
    persistServiceState('bookings.status', { bookingId: booking.id, status: booking.status });
    if (body.status === 'CONFIRMED') {
      await publishKafkaEvent('booking.confirmed', { bookingId: booking.id, payload: booking });
      await publishSnsNotification({ type: 'booking', userId: booking.userId, message: `Booking confirmed: ${booking.id}`, timestamp: new Date().toISOString() });
    }
    return json({ booking });
  }
  if (body.action === 'cancel') {
    const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    if (body.userId && booking.userId !== body.userId) return json({ error: 'Booking does not belong to this user' }, 403);
    if (Date.now() - booking.createdAt > CANCEL_WINDOW_MS) return json({ error: 'Cancellation allowed only within 5 minutes of booking' }, 409);
    booking.status = 'CANCELLED';
    serviceState.refunds.push({ id: createId('rfd'), bookingId: booking.id, amount: booking.totalAmount, status: 'INITIATED' });
    persistServiceState('bookings.cancel', { bookingId: booking.id });
    await publishKafkaEvent('booking.cancelled', { bookingId: booking.id, payload: booking });
    return json({ booking });
  }
  return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
    console.error('[bookings] POST failed', error);
    return json({ error: 'Internal error while processing booking' }, 500);
  }
}
