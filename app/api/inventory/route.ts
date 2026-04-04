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
    }
  });
  return json({ seats: serviceState.seats[eventId] });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'hold') {
    const seats = serviceState.seats[body.eventId] ?? [];
    const selected = seats.filter((seat) => body.seatIds.includes(seat.id));
    if (selected.some((seat) => seat.status !== 'AVAILABLE')) return json({ error: 'One or more seats not available' }, 409);
    const holdToken = createId('hold');
    const expiry = Date.now() + 5 * 60 * 1000;
    selected.forEach((seat) => { seat.status = 'HELD'; seat.holdToken = holdToken; seat.holdExpiry = expiry; });
    return json({ holdToken, expiry, seats: selected.map((seat) => seat.id) });
  }

  if (body.action === 'release') {
    const seats = serviceState.seats[body.eventId] ?? [];
    seats.forEach((seat) => {
      if (seat.holdToken === body.holdToken && seat.status === 'HELD') {
        seat.status = 'AVAILABLE';
        seat.holdToken = '';
        seat.holdExpiry = 0;
      }
    });
    return json({ released: true });
  }

  return json({ error: 'Unsupported action' }, 400);
}
