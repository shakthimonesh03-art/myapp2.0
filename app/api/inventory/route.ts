import { createId, json, serviceState } from '@/lib/serviceState';

function releaseExpiredHolds(eventId: string) {
  const now = Date.now();
  (serviceState.seats[eventId] ?? []).forEach((seat) => {
    if (seat.status === 'HELD' && seat.holdExpiry <= now) {
      seat.status = 'AVAILABLE';
      seat.holdToken = '';
      seat.holdExpiry = 0;
    }
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  if (!eventId || !serviceState.seats[eventId]) return json({ error: 'Invalid eventId' }, 400);
  releaseExpiredHolds(eventId);
  return json({ seats: serviceState.seats[eventId] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const seats = serviceState.seats[body.eventId] ?? [];
  releaseExpiredHolds(body.eventId);

  if (body.action === 'hold') {
    if (!body.userId) return json({ error: 'userId required' }, 400);
    const selected = seats.filter((seat) => body.seatIds.includes(seat.id));
    if (selected.some((seat) => seat.status !== 'AVAILABLE')) return json({ error: 'One or more seats not available' }, 409);
    const holdToken = `${createId('hold')}:${body.userId}`;
    const expiry = Date.now() + 5 * 60 * 1000;
    selected.forEach((seat) => { seat.status = 'HELD'; seat.holdToken = holdToken; seat.holdExpiry = expiry; });
    return json({ holdToken, expiry, seats: selected.map((seat) => seat.id) });
  }

  if (body.action === 'release') {
    seats.forEach((seat) => {
      if (seat.holdToken === body.holdToken && seat.status === 'HELD') {
        seat.status = 'AVAILABLE';
        seat.holdToken = '';
        seat.holdExpiry = 0;
      }
    });
    return json({ released: true });
  }

  if (body.action === 'book') {
    if (!body.holdToken) return json({ error: 'holdToken required' }, 400);
    const selected = seats.filter((seat) => body.seatIds.includes(seat.id));
    const valid = selected.length === body.seatIds.length && selected.every((seat) => seat.status === 'HELD' && seat.holdToken === body.holdToken && seat.holdExpiry > Date.now());
    if (!valid) return json({ error: 'Seats are no longer held by this user' }, 409);
    selected.forEach((seat) => {
      seat.status = 'BOOKED';
      seat.holdToken = '';
      seat.holdExpiry = 0;
    });
    return json({ booked: body.seatIds });
  }

  if (body.action === 'block') {
    seats.forEach((seat) => {
      if (body.seatIds.includes(seat.id)) seat.status = 'BLOCKED';
    });
    return json({ blocked: body.seatIds });
  }

  return json({ error: 'Unsupported action' }, 400);
}
