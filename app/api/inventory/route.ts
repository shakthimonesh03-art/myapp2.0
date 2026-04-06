import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  if (!eventId || !serviceState.seats[eventId]) return json({ error: 'Invalid eventId' }, 400);
  const now = Date.now();
  serviceState.seats[eventId].forEach((seat) => {
    if (seat.status === 'HELD' && seat.holdExpiry <= now) {
      seat.status = 'AVAILABLE';
      seat.holdToken = '';
      seat.holdExpiry = 0;
    }
  });
  return json({ seats: serviceState.seats[eventId] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const seats = serviceState.seats[body.eventId] ?? [];

  if (body.action === 'hold') {
    const selected = seats.filter((seat) => body.seatIds.includes(seat.id));
    if (selected.some((seat) => seat.status !== 'AVAILABLE')) return json({ error: 'One or more seats not available' }, 409);
    const holdToken = createId('hold');
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
    seats.forEach((seat) => {
      if (body.seatIds.includes(seat.id) && seat.status === 'HELD') seat.status = 'BOOKED';
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
