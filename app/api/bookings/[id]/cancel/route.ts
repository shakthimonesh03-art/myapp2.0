import { POST as bookingsPost } from '@/app/api/bookings/route';
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return bookingsPost(new Request('http://local/api/bookings', { method: 'POST', body: JSON.stringify({ action: 'cancel', bookingId: params.id }) }));
}
