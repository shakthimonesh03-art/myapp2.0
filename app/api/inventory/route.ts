import { appState, createId, json } from '@/lib/serviceState';

function uniqueSeatIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((value) => (typeof value === 'string' ? value.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  );
}

function releaseExpiredHolds(eventId: string) {
  const now = Date.now();
  const seats = appState.seats[eventId] || [];
  seats.forEach((seat) => {
    if (seat.status === 'HELD' && seat.holdExpiry <= now) {
      seat.status = 'AVAILABLE';
      seat.holdToken = '';
      seat.holdExpiry = 0;
      seat.holdUserId = '';
    }
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  const requesterUserId = (searchParams.get('userId') || '').trim();
  if (!eventId || !appState.seats[eventId]) return json({ error: 'Invalid eventId' }, 400);

  releaseExpiredHolds(eventId);

  return json({
    seats: appState.seats[eventId].map((seat) => ({
      id: seat.id,
      label: seat.id,
      status: seat.status,
      price: seat.price,
      ownedByRequester: Boolean(requesterUserId && seat.status === 'HELD' && seat.holdUserId === requesterUserId)
    }))
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  if (!eventId || !appState.seats[eventId]) return json({ error: 'Invalid eventId' }, 400);

  releaseExpiredHolds(eventId);
  const seats = appState.seats[eventId];

  if (body.action === 'hold') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const seatIds = uniqueSeatIds(body.seatIds);
    if (!userId) return json({ error: 'userId is required.' }, 400);
    if (!seatIds.length) return json({ error: 'At least one seat must be selected.' }, 400);

    const selected = seats.filter((seat) => seatIds.includes(seat.id));
    if (selected.length !== seatIds.length) return json({ error: 'One or more seats are invalid.' }, 400);
    if (selected.some((seat) => seat.status !== 'AVAILABLE')) return json({ error: 'One or more seats are not available.' }, 409);

    const holdToken = createId('hold');
    const expiry = Date.now() + 5 * 60 * 1000;
    selected.forEach((seat) => {
      seat.status = 'HELD';
      seat.holdToken = holdToken;
      seat.holdExpiry = expiry;
      seat.holdUserId = userId;
    });

    return json({ holdToken, expiry, seats: seatIds });
  }

  if (body.action === 'refresh-hold') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const holdTokenInput = typeof body.holdToken === 'string' ? body.holdToken.trim() : '';
    const seatIds = uniqueSeatIds(body.seatIds);
    if (!userId) return json({ error: 'userId is required.' }, 400);

    if (!seatIds.length) {
      if (holdTokenInput) {
        seats.forEach((seat) => {
          if (seat.status === 'HELD' && seat.holdToken === holdTokenInput && seat.holdUserId === userId) {
            seat.status = 'AVAILABLE';
            seat.holdToken = '';
            seat.holdExpiry = 0;
            seat.holdUserId = '';
          }
        });
      }
      return json({ released: true, seats: [] as string[] });
    }

    const selected = seats.filter((seat) => seatIds.includes(seat.id));
    if (selected.length !== seatIds.length) return json({ error: 'One or more seats are invalid.' }, 400);

    const invalid = selected.some((seat) => seat.status !== 'AVAILABLE' && !(seat.status === 'HELD' && seat.holdUserId === userId));
    if (invalid) return json({ error: 'One or more seats are not available.' }, 409);

    const hasMatchingHold = holdTokenInput
      ? seats.some((seat) => seat.status === 'HELD' && seat.holdToken === holdTokenInput && seat.holdUserId === userId)
      : false;
    const holdToken = hasMatchingHold ? holdTokenInput : createId('hold');
    const expiry = Date.now() + 5 * 60 * 1000;

    seats.forEach((seat) => {
      if (seat.status === 'HELD' && seat.holdUserId === userId && !seatIds.includes(seat.id)) {
        seat.status = 'AVAILABLE';
        seat.holdToken = '';
        seat.holdExpiry = 0;
        seat.holdUserId = '';
      }
    });

    selected.forEach((seat) => {
      seat.status = 'HELD';
      seat.holdToken = holdToken;
      seat.holdExpiry = expiry;
      seat.holdUserId = userId;
    });

    return json({ holdToken, expiry, seats: seatIds });
  }

  if (body.action === 'release') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const holdToken = typeof body.holdToken === 'string' ? body.holdToken : '';
    if (!holdToken || !userId) return json({ error: 'holdToken and userId are required.' }, 400);

    seats.forEach((seat) => {
      if (seat.holdToken === holdToken && seat.status === 'HELD' && seat.holdUserId === userId) {
        seat.status = 'AVAILABLE';
        seat.holdToken = '';
        seat.holdExpiry = 0;
        seat.holdUserId = '';
      }
    });

    return json({ released: true });
  }

  if (body.action === 'book') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const holdToken = typeof body.holdToken === 'string' ? body.holdToken : '';
    const seatIds = uniqueSeatIds(body.seatIds);
    if (!holdToken || !seatIds.length || !userId) return json({ error: 'holdToken, userId and seatIds are required.' }, 400);

    const selected = seats.filter((seat) => seatIds.includes(seat.id));
    if (selected.length !== seatIds.length) return json({ error: 'One or more seats are invalid.' }, 400);

    const invalid = selected.some(
      (seat) => seat.status !== 'HELD' || seat.holdToken !== holdToken || seat.holdUserId !== userId || seat.holdExpiry <= Date.now()
    );
    if (invalid) return json({ error: 'Selected seats are no longer held for this booking.' }, 409);

    selected.forEach((seat) => {
      seat.status = 'BOOKED';
      seat.holdToken = '';
      seat.holdExpiry = 0;
      seat.holdUserId = '';
    });

    return json({ booked: seatIds });
  }

  if (body.action === 'block') {
    const seatIds = uniqueSeatIds(body.seatIds);
    if (!seatIds.length) return json({ error: 'seatIds are required.' }, 400);

    seats.forEach((seat) => {
      if (seatIds.includes(seat.id)) {
        seat.status = 'BLOCKED';
        seat.holdToken = '';
        seat.holdExpiry = 0;
        seat.holdUserId = '';
      }
    });

    return json({ blocked: seatIds });
  }

  return json({ error: 'Unsupported action' }, 400);
}
