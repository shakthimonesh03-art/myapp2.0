import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({
    events: serviceState.events.length,
    venues: serviceState.venues.length,
    bookings: serviceState.bookings.length,
    refunds: serviceState.refunds.length,
    coupons: serviceState.coupons
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'coupon') {
    const coupon = { code: body.code, discountPct: body.discountPct ?? 10 };
    serviceState.coupons.push(coupon);
    return json({ coupon }, 201);
  }
  if (body.action === 'refund') {
    const refund = { id: createId('rfd'), bookingId: body.bookingId, amount: body.amount, status: 'APPROVED' };
    serviceState.refunds.push(refund);
    return json({ refund }, 201);
  }
  return json({ error: 'Unsupported action' }, 400);
}
