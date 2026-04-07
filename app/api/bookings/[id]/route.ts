import { json, serviceState } from '@/lib/serviceState';
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const booking = serviceState.bookings.find((item) => item.id === params.id);
  if (!booking) return json({ error: 'Booking not found' }, 404);
  if (userId && booking.userId !== userId) return json({ error: 'Forbidden' }, 403);
  return json({ booking });
}
