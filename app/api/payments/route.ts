import { createId, json, serviceState } from '@/lib/serviceState';

export async function POST(req: Request) {
  const body = await req.json();
  const duplicate = serviceState.payments.find((payment) => payment.idempotencyKey === body.idempotencyKey);
  if (duplicate) return json({ payment: duplicate, duplicate: true });
  const payment = { id: createId('pay'), bookingId: body.bookingId, status: body.status || 'SUCCESS', amount: body.amount, providerRef: createId('razor'), idempotencyKey: body.idempotencyKey };
  serviceState.payments.push(payment);
  const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
  if (booking && payment.status === 'SUCCESS') booking.status = 'CONFIRMED';
  if (booking && payment.status !== 'SUCCESS') booking.status = 'FAILED';
  return json({ payment });
}
