import { json, serviceState } from '@/lib/serviceState';

export async function GET() {
  const confirmed = serviceState.bookings.filter((booking) => booking.status === 'CONFIRMED');
  const revenue = confirmed.reduce((sum, booking) => sum + booking.totalAmount, 0);
  const failedPayments = serviceState.payments.filter((payment) => payment.status !== 'SUCCESS').length;
  const topEvents: Record<string, number> = {};
  confirmed.forEach((booking) => {
    topEvents[booking.eventId] = (topEvents[booking.eventId] || 0) + 1;
  });

  return json({
    bookingReports: serviceState.bookings.length,
    revenueReports: revenue,
    occupancyReports: confirmed.length,
    topEvents,
    failedPaymentReports: failedPayments,
    refundReports: serviceState.refunds.length
  });
}
