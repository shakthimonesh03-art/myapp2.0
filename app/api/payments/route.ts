import { createId, json, serviceState } from '@/lib/serviceState';

export async function POST(req: Request) {
  const body = await req.json();
  const duplicate = serviceState.payments.find((payment) => payment.idempotencyKey === body.idempotencyKey);
  if (duplicate) return json({ payment: duplicate, duplicate: true });

  const payment = {
    id: createId('pay'),
    bookingId: body.bookingId,
    provider: body.provider || 'RAZORPAY',
    providerRef: createId('rzp'),
    status: body.status || 'SUCCESS',
    amount: body.amount,
    idempotencyKey: body.idempotencyKey,
    createdAt: Date.now()
  };
  serviceState.payments.push(payment);

  const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
  if (booking) booking.status = payment.status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

  return json({ payment });
}
