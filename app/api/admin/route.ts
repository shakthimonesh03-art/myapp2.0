import { createId, json, serviceState } from '@/lib/serviceState';

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
  const body = await req.json();

  if (body.action === 'create-venue') {
    const venue = { id: createId('v'), name: body.name, city: body.city, address: body.address || '', capacity: body.capacity || 0, hall: body.hall || 'Main', categories: body.categories || ['Regular'] };
    serviceState.venues.push(venue);
    return json({ venue }, 201);
  }

  if (body.action === 'create-event') {
    const event = { id: createId('ev'), ...body.event, status: 'DRAFT' };
    serviceState.events.push(event);
    return json({ event }, 201);
  }

  if (body.action === 'coupon') {
    const coupon = { code: body.code, discountPct: body.discountPct ?? 10, active: true };
    serviceState.coupons.push(coupon);
    return json({ coupon }, 201);
  }

  if (body.action === 'refund') {
    const refund = { id: createId('rfd'), bookingId: body.bookingId, paymentId: body.paymentId, amount: body.amount, status: 'APPROVED' };
    serviceState.refunds.push(refund);
    return json({ refund }, 201);
  }

  return json({ error: 'Unsupported action' }, 400);
}
