import { appState, createId, json } from '@/lib/serviceState';

export async function GET() {
  return json({ venues: appState.venues });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'create') {
    const venue = { id: createId('v'), name: body.name, city: body.city, address: body.address || '', capacity: body.capacity || 0, hall: body.hall || 'Main', categories: body.categories || ['Regular'] };
    appState.venues.push(venue);
    return json({ venue }, 201);
  }
  if (body.action === 'seat-layout') {
    const seats = appState.seats[body.eventId] ?? [];
    return json({ eventId: body.eventId, seats });
  }
  return json({ error: 'Unsupported action' }, 400);
}
