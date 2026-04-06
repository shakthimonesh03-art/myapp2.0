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
  if (body.action === 'update') {
    const venue = serviceState.venues.find((item) => item.id === body.venueId);
    if (!venue) return json({ error: 'Venue not found' }, 404);
    Object.assign(venue, body.updates || {});
    return json({ venue });
  }
  if (body.action === 'delete') {
    const idx = serviceState.venues.findIndex((item) => item.id === body.venueId);
    if (idx === -1) return json({ error: 'Venue not found' }, 404);
    const [venue] = serviceState.venues.splice(idx, 1);
    return json({ venue, deleted: true });
  }
  if (body.action === 'seat-layout') {
    const seats = serviceState.seats[body.eventId] ?? [];
    return json({ eventId: body.eventId, seats });
  }
  return json({ error: 'Unsupported action' }, 400);
}
