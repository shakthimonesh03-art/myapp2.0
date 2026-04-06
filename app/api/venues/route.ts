import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({ venues: serviceState.venues });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'create') {
    const venue = { id: createId('v'), name: body.name, city: body.city, address: body.address || '', capacity: body.capacity || 0, hall: body.hall || 'Main', categories: body.categories || ['Regular'] };
    serviceState.venues.push(venue);
    return json({ venue }, 201);
  }
  if (body.action === 'seat-layout') {
    const seats = serviceState.seats[body.eventId] ?? [];
    return json({ eventId: body.eventId, seats });
  }
  return json({ error: 'Unsupported action' }, 400);
}
