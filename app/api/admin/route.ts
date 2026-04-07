import { createId, json, serviceState } from '@/lib/serviceState';
import { persistServiceState } from '@/lib/serviceState';
import { publishSnsNotification } from '@/lib/aws';

export async function GET() {
  return json({
    events: serviceState.events.length,
    venues: serviceState.venues.length,
    bookings: serviceState.bookings.length,
    refunds: serviceState.refunds.length,
    coupons: serviceState.coupons,
    salesMonitor: serviceState.bookings.slice(0, 10)
  });
}

export async function POST(req: Request) {
  try {
  const body = await req.json();

  if (body.action === 'create-venue') {
    const venue = { id: createId('v'), name: body.name, city: body.city, address: body.address || '', capacity: body.capacity || 0, hall: body.hall || 'Main', categories: body.categories || ['Regular'] };
    serviceState.venues.push(venue);
    persistServiceState('admin.create-venue', { venueId: venue.id });
    return json({ venue }, 201);
  }

  if (body.action === 'create-event') {
    const event = { id: createId('ev'), ...body.event, status: 'DRAFT' };
    serviceState.events.push(event);
    persistServiceState('admin.create-event', { eventId: event.id });
    return json({ event }, 201);
  }

  if (body.action === 'coupon') {
    const coupon = { code: body.code, discountPct: body.discountPct ?? 10, active: true };
    serviceState.coupons.push(coupon);
    persistServiceState('admin.coupon', { code: coupon.code });
    return json({ coupon }, 201);
  }

  if (body.action === 'refund') {
    const refund = { id: createId('rfd'), bookingId: body.bookingId, paymentId: body.paymentId, amount: body.amount, status: 'APPROVED' };
    serviceState.refunds.push(refund);
    const booking = serviceState.bookings.find((item) => item.id === body.bookingId);
    if (booking) {
      await publishSnsNotification({ type: 'refund', userId: booking.userId, message: `Refund processed for booking ${booking.id}`, timestamp: new Date().toISOString() });
    }
    persistServiceState('admin.refund', { refundId: refund.id });
    return json({ refund }, 201);
  }

  return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
    console.error('[admin] POST failed', error);
    return json({ error: 'Internal error while processing admin action' }, 500);
  }
}
