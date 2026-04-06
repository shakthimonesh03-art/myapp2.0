import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({ venues: serviceState.venues });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'create') {
    if (body.city && !serviceState.locations.includes(body.city)) serviceState.locations.push(body.city);
    const venue = { id: createId('v'), name: body.name, city: body.city, address: body.address || '', capacity: body.capacity || 0, hall: body.hall || 'Main', categories: body.categories || ['Regular'] };
    serviceState.venues.push(venue);
    return json({ venue }, 201);
  }
  if (body.action === 'update') {
    const venue = serviceState.venues.find((item) => item.id === body.venueId);
    if (!venue) return json({ error: 'Venue not found' }, 404);
    if (body.updates?.city && !serviceState.locations.includes(body.updates.city)) serviceState.locations.push(body.updates.city);
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
  if (body.action === 'update-seat-layout') {
    const rows = Math.max(1, Number(body.rows || 1));
    const cols = Math.max(1, Number(body.cols || 1));
    const vipRows = Math.max(0, Math.min(rows, Number(body.vipRows || 0)));
    const seats = Array.from({ length: rows * cols }).map((_, index) => {
      const rowIndex = Math.floor(index / cols);
      const colIndex = (index % cols) + 1;
      const rowLabel = String.fromCharCode(65 + rowIndex);
      const isVip = rowIndex < vipRows;
      return {
        id: `${rowLabel}${colIndex}`,
        rowLabel,
        seatNumber: `${colIndex}`,
        category: isVip ? 'VIP' : (body.defaultCategory || 'Regular'),
        price: isVip ? Number(body.vipPrice || 2200) : Number(body.regularPrice || 1200),
        status: 'AVAILABLE' as const,
        holdToken: '',
        holdExpiry: 0
      };
    });
    serviceState.seats[body.eventId] = seats;
    return json({ eventId: body.eventId, seats, updated: true });
  }
  return json({ error: 'Unsupported action' }, 400);
}
