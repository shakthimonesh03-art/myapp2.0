export type SeatState = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
export type BookingStatus = 'PENDING' | 'PAYMENT_IN_PROGRESS' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

export const gatewayState = {
  requests: [] as { path: string; method: string; ts: number; ip: string }[],
  rateLimit: new Map<string, { count: number; resetAt: number }>()
};

export const serviceState = {
  locations: ['Bengaluru', 'Mumbai', 'Hyderabad', 'New York', 'Dubai'],
  users: [{ id: 'u1', name: 'Demo User', email: 'demo@ticketpulse.app', phone: '9999999999', role: 'customer', cityPreference: 'Bengaluru', passwordHash: 'hashed-demo', createdAt: Date.now() }],
  events: [
    {
      id: 'ev1',
      title: 'Neon Nights Concert',
      description: 'EDM live concert',
      category: 'Music',
      language: 'English',
      bannerUrl: 'banners/ev1.jpg',
      startTime: '2026-05-10T19:30:00Z',
      endTime: '2026-05-10T22:30:00Z',
      city: 'Bengaluru',
      venueId: 'v1',
      status: 'PUBLISHED',
      organizerId: 'org1',
      ageRestriction: '16+',
      cancellationPolicy: '24h before show'
    }
  ],
  venues: [
    { id: 'v1', name: 'SkyDome Arena', city: 'Bengaluru', address: 'Central Ave', capacity: 1800, hall: 'Hall-A', categories: ['VIP', 'Regular'] }
  ],
  seats: {
    ev1: Array.from({ length: 24 }).map((_, i) => ({ id: `A${i + 1}`, rowLabel: 'A', seatNumber: `${i + 1}`, category: i < 4 ? 'VIP' : 'Regular', price: i < 4 ? 2200 : 1200, status: i % 12 === 0 ? 'BOOKED' : 'AVAILABLE' as SeatState, holdToken: '', holdExpiry: 0 }))
  } as Record<string, { id: string; rowLabel: string; seatNumber: string; category: string; price: number; status: SeatState; holdToken: string; holdExpiry: number }[]>,
  bookings: [] as { id: string; userId: string; eventId: string; seats: string[]; totalAmount: number; status: BookingStatus; createdAt: number }[],
  payments: [] as { id: string; bookingId: string; provider: string; providerRef: string; status: string; amount: number; idempotencyKey: string; createdAt: number }[],
  notifications: [] as { id: string; userId: string; type: string; status: string; payload: string; sentAt: number }[],
  coupons: [] as { code: string; discountPct: number; active: boolean }[],
  refunds: [] as { id: string; bookingId: string; paymentId?: string; amount: number; status: string }[]
};

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extraHeaders } });
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function hashPassword(password: string) {
  return `hashed-${Buffer.from(password).toString('base64')}`;
}
