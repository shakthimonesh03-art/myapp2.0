import { createId, json, serviceState } from '@/lib/serviceState';
import { persistServiceState } from '@/lib/serviceState';
import { publishKafkaEvent } from '@/lib/kafka';
import { publishSnsNotification } from '@/lib/aws';

export async function POST(req: Request) {
  try {
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
    persistServiceState('payments.create', { paymentId: payment.id, bookingId: body.bookingId, status: payment.status });
    await publishKafkaEvent('payment.completed', { bookingId: body.bookingId, payload: payment });
    if (booking && payment.status === 'SUCCESS') {
      await publishKafkaEvent('booking.confirmed', { bookingId: booking.id, payload: booking });
      await publishSnsNotification({ type: 'payment', userId: booking.userId, message: `Payment completed for booking ${booking.id}`, timestamp: new Date().toISOString() });
    }

    return json({ payment });
  } catch (error) {
    console.error('[payments] POST failed', error);
    return json({ error: 'Internal error while processing payment' }, 500);
  }
}
