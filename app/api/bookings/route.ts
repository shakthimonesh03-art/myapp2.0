import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const bookings = userId ? serviceState.bookings.filter((booking) => booking.userId === userId) : [];
  return json({ bookings });
}

export async function POST(req: Request) {
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
    return json({ booking }, 201);
  }
  if (body.action === 'status') {
    const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    booking.status = body.status;
    return json({ booking });
  }
  if (body.action === 'cancel') {
    const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    if (body.userId && booking.userId !== body.userId) return json({ error: 'Booking does not belong to this user' }, 403);
    booking.status = 'CANCELLED';
    serviceState.refunds.push({ id: createId('rfd'), bookingId: booking.id, amount: booking.totalAmount, status: 'INITIATED' });
    return json({ booking });
  }
  return json({ error: 'Unsupported action' }, 400);
}
