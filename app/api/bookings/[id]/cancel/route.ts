import { POST as bookingsPost } from '@/app/api/bookings/route';
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  return bookingsPost(new Request('http://local/api/bookings', { method: 'POST', body: JSON.stringify({ action: 'cancel', bookingId: params.id, userId: body.userId }) }));
}
