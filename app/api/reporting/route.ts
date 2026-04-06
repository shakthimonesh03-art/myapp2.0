import { json, serviceState } from '@/lib/serviceState';

export async function GET() {
  const confirmed = serviceState.bookings.filter((booking) => booking.status === 'CONFIRMED');
  const failedPayments = serviceState.payments.filter((payment) => payment.status !== 'SUCCESS').length;
  const revenue = confirmed.reduce((sum, booking) => sum + booking.amount, 0);
  return json({
    totalBookings: serviceState.bookings.length,
    confirmedBookings: confirmed.length,
    revenue,
    failedPayments,
    refunds: serviceState.refunds.length
  });
}
