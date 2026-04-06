import { json, serviceState } from '@/lib/serviceState';
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const booking = serviceState.bookings.find((item) => item.id === params.id);
  return booking ? json({ booking }) : json({ error: 'Booking not found' }, 404);
}
