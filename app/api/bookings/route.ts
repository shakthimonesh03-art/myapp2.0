import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const bookings = userId ? serviceState.bookings.filter((booking) => booking.userId === userId) : serviceState.bookings;
  return json({ bookings });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'create') {
    const booking = { id: createId('bkg'), eventId: body.eventId, userId: body.userId, seats: body.seats, amount: body.amount, status: 'PENDING', createdAt: Date.now() };
    serviceState.bookings.push(booking);
    return json({ booking }, 201);
  }
  if (body.action === 'cancel') {
    const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    booking.status = 'CANCELLED';
    serviceState.refunds.push({ id: createId('rfd'), bookingId: booking.id, amount: booking.amount, status: 'INITIATED' });
    return json({ booking });
  }
  return json({ error: 'Unsupported action' }, 400);
}
