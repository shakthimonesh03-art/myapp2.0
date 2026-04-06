export type SeatState = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';

export const serviceState = {
  users: [{ id: 'u1', name: 'Demo User', email: 'demo@ticketpulse.app', role: 'customer' }],
  events: [
    { id: 'ev1', title: 'Neon Nights Concert', city: 'Bengaluru', category: 'Music', venueId: 'v1', date: '2026-05-10', basePrice: 1200 },
    { id: 'ev2', title: 'Standup Live', city: 'Mumbai', category: 'Comedy', venueId: 'v2', date: '2026-05-20', basePrice: 800 }
  ],
  venues: [
    { id: 'v1', name: 'SkyDome Arena', city: 'Bengaluru', capacity: 1800 },
    { id: 'v2', name: 'Laugh Hall', city: 'Mumbai', capacity: 640 }
  ],
  seats: {
    ev1: Array.from({ length: 20 }).map((_, i) => ({ id: `A${i + 1}`, status: i % 11 === 0 ? 'BOOKED' : 'AVAILABLE' as SeatState, holdToken: '', holdExpiry: 0 })),
    ev2: Array.from({ length: 16 }).map((_, i) => ({ id: `B${i + 1}`, status: i % 9 === 0 ? 'BOOKED' : 'AVAILABLE' as SeatState, holdToken: '', holdExpiry: 0 }))
  } as Record<string, { id: string; status: SeatState; holdToken: string; holdExpiry: number }[]>,
  bookings: [] as { id: string; eventId: string; userId: string; seats: string[]; amount: number; status: string; createdAt: number }[],
  payments: [] as { id: string; bookingId: string; status: string; amount: number; providerRef: string; idempotencyKey: string }[],
  notifications: [] as { id: string; userId: string; type: string; message: string; sentAt: number }[],
  coupons: [] as { code: string; discountPct: number }[],
  refunds: [] as { id: string; bookingId: string; amount: number; status: string }[]
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
