import { appState, createId, json } from '@/lib/serviceState';

export async function GET() {
  return json({
    events: appState.events.length,
    venues: appState.venues.length,
    bookings: appState.bookings.length,
    refunds: appState.refunds.length,
    coupons: appState.coupons,
    salesMonitor: appState.bookings.slice(0, 10)
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'create-venue') {
    const venue = { id: createId('v'), name: body.name, city: body.city, address: body.address || '', capacity: body.capacity || 0, hall: body.hall || 'Main', categories: body.categories || ['Regular'] };
    appState.venues.push(venue);
    return json({ venue }, 201);
  }

  if (body.action === 'create-event') {
    const event = { id: createId('ev'), ...body.event, status: 'DRAFT' };
    appState.events.push(event);
    return json({ event }, 201);
  }

  if (body.action === 'coupon') {
    const coupon = { code: body.code, discountPct: body.discountPct ?? 10, active: true };
    appState.coupons.push(coupon);
    return json({ coupon }, 201);
  }

  if (body.action === 'refund') {
    const refund = { id: createId('rfd'), bookingId: body.bookingId, paymentId: body.paymentId, amount: body.amount, status: 'APPROVED' };
    appState.refunds.push(refund);
    return json({ refund }, 201);
  }

  return json({ error: 'Unsupported action' }, 400);
}
