import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const date = searchParams.get('date');
  const events = serviceState.events.filter((event) => (!city || event.city === city) && (!category || event.category === category) && (!date || event.date === date));
  return json({ events });
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = { id: createId('ev'), ...body };
  serviceState.events.push(event);
  serviceState.seats[event.id] = Array.from({ length: body.capacity || 20 }).map((_, i) => ({ id: `${body.rowPrefix || 'A'}${i + 1}`, status: 'AVAILABLE' as const, holdToken: '', holdExpiry: 0 }));
  return json({ event }, 201);
}
