import { appState, createId, json, type BookingStatus } from '@/lib/serviceState';

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

function isValidStatus(status: unknown): status is BookingStatus {
  return ['PENDING', 'PAYMENT_IN_PROGRESS', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED'].includes(String(status));
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

function isPaymentInProgressHoldActive(eventId: string, holdToken: string | undefined, seatIds: string[]): boolean {
  if (!holdToken) return false;
  const seats = appState.seats[eventId];
  if (!seats) return false;
  const heldSeats = seats.filter((seat) => seatIds.includes(seat.id));
  if (heldSeats.length !== seatIds.length) return false;
  const now = Date.now();
  return heldSeats.every((seat) => seat.status === 'HELD' && seat.holdToken === holdToken && seat.holdExpiry > now);
}

function hasActiveSeatConflict(eventId: string, seatIds: string[], ignoredBookingId?: string): boolean {
  return appState.bookings.some((booking) => {
    if (booking.eventId !== eventId) return false;
    if (ignoredBookingId && booking.id === ignoredBookingId) return false;
    const overlaps = booking.seats.some((seatId) => seatIds.includes(seatId));
    if (!overlaps) return false;
    if (booking.status === 'CONFIRMED') return true;
    if (booking.status === 'PAYMENT_IN_PROGRESS') {
      return isPaymentInProgressHoldActive(eventId, booking.holdToken, booking.seats);
    }
    return false;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const bookings = userId ? appState.bookings.filter((booking) => booking.userId === userId) : appState.bookings;
  const ordered = [...bookings].sort((a, b) => b.createdAt - a.createdAt);
  return json({ bookings: ordered });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'reset-bookings') {
    appState.bookings = [];

    Object.keys(appState.seats).forEach((eventId) => {
      appState.seats[eventId].forEach((seat) => {
        if (seat.status === 'BOOKED' || seat.status === 'HELD') {
          seat.status = 'AVAILABLE';
          seat.holdToken = '';
          seat.holdExpiry = 0;
          seat.holdUserId = '';
        }
      });
    });

    return json({ reset: true, bookings: appState.bookings.length });
  }

  if (body.action === 'create') {
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const eventTitle = typeof body.eventTitle === 'string' ? body.eventTitle : '';
    const holdToken = typeof body.holdToken === 'string' ? body.holdToken : '';
    const totalAmount = Number(body.totalAmount);
    const seatIds = uniqueSeatIds(body.seats);

    if (!eventId || !userId || !eventTitle || !holdToken) return json({ error: 'eventId, userId, eventTitle and holdToken are required.' }, 400);
    if (!seatIds.length) return json({ error: 'At least one seat is required.' }, 400);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return json({ error: 'Invalid totalAmount.' }, 400);

    const seats = appState.seats[eventId];
    if (!seats) return json({ error: 'Invalid eventId.' }, 400);

    releaseExpiredHolds(eventId);

    const selected = seats.filter((seat) => seatIds.includes(seat.id));
    if (selected.length !== seatIds.length) return json({ error: 'One or more seats are invalid.' }, 400);

    const holdInvalid = selected.some(
      (seat) => seat.status !== 'HELD' || seat.holdToken !== holdToken || seat.holdUserId !== userId || seat.holdExpiry <= Date.now()
    );
    if (holdInvalid) {
      return json({ error: 'Selected seats are no longer held for this user. Please select seats again.' }, 409);
    }

    const existingPending = appState.bookings.find((booking) => {
      if (booking.eventId !== eventId || booking.userId !== userId || booking.status !== 'PAYMENT_IN_PROGRESS') return false;
      if (booking.holdToken !== holdToken) return false;
      if (booking.seats.length !== seatIds.length) return false;
      return booking.seats.every((seatId) => seatIds.includes(seatId));
    });
    if (existingPending) {
      existingPending.eventTitle = eventTitle;
      existingPending.totalAmount = totalAmount;
      existingPending.updatedAt = Date.now();
      return json({ booking: existingPending, duplicate: true });
    }

    if (hasActiveSeatConflict(eventId, seatIds)) {
      return json({ error: 'One or more seats are already booked or in payment.' }, 409);
    }

    const booking = {
      id: createId('bkg'),
      userId,
      eventId,
      eventTitle,
      seats: seatIds,
      holdToken,
      totalAmount,
      status: 'PAYMENT_IN_PROGRESS' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cancellable: true
    };

    appState.bookings.push(booking);
    return json({ booking }, 201);
  }

  if (body.action === 'status') {
    const booking = appState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    if (!isValidStatus(body.status)) return json({ error: 'Invalid booking status.' }, 400);
    booking.status = body.status;
    booking.updatedAt = Date.now();
    return json({ booking });
  }

  if (body.action === 'cancel') {
    const booking = appState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);
    booking.status = 'CANCELLED';
    booking.updatedAt = Date.now();
    appState.refunds.push({ id: createId('rfd'), bookingId: booking.id, amount: booking.totalAmount, status: 'INITIATED' });
    return json({ booking });
  }

  if (body.action === 'update-admin') {
    const booking = appState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    const nextAmount = body.totalAmount === undefined ? booking.totalAmount : Number(body.totalAmount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) return json({ error: 'Invalid totalAmount.' }, 400);

    if (body.status !== undefined && !isValidStatus(body.status)) {
      return json({ error: 'Invalid booking status.' }, 400);
    }

    booking.totalAmount = nextAmount;
    if (body.status !== undefined) booking.status = body.status;
    booking.updatedAt = Date.now();

    return json({ booking });
  }

  if (body.action === 'attach-assets') {
    const booking = appState.bookings.find((item) => item.id === body.bookingId);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    if (typeof body.qr === 'string' && body.qr) booking.qr = body.qr;
    if (body.s3Assets && typeof body.s3Assets === 'object') {
      booking.s3Assets = body.s3Assets;
    }
    booking.updatedAt = Date.now();
    return json({ booking });
  }

  return json({ error: 'Unsupported action' }, 400);
}
