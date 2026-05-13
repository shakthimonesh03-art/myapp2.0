import { readDbSync, writeDbSync } from './db';

export type SeatState = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
export type BookingStatus = 'PENDING' | 'PAYMENT_IN_PROGRESS' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

export type SeatRecord = {
  id: string;
  rowLabel: string;
  seatNumber: string;
  category: string;
  price: number;
  status: SeatState;
  holdToken: string;
  holdExpiry: number;
  holdUserId: string;
};

export type BookingRecord = {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  seats: string[];
  holdToken?: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: number;
  updatedAt: number;
  qr?: string;
  cancellable: boolean;
  s3Assets?: { ticketPdfUrl: string; qrImageUrl: string; invoiceUrl: string; logsUrl: string };
};

export type AppState = {
  users: any[];
  events: any[];
  venues: any[];
  seats: Record<string, SeatRecord[]>;
  bookings: BookingRecord[];
  payments: any[];
  notifications: any[];
  coupons: any[];
  refunds: any[];
};

function createSeats(prefix: string, total: number): SeatRecord[] {
  return Array.from({ length: total }).map((_, i) => ({
    id: `${prefix}${i + 1}`,
    rowLabel: prefix,
    seatNumber: `${i + 1}`,
    category: i < 4 ? 'VIP' : 'Regular',
    price: 5,
    status: 'AVAILABLE',
    holdToken: '',
    holdExpiry: 0,
    holdUserId: ''
  }));
}

function getInitialState(): AppState {
  return {
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
      ev1: createSeats('A', 32),
      ev2: createSeats('B', 40),
      ev3: createSeats('C', 36)
    },
    bookings: [],
    payments: [],
    notifications: [],
    coupons: [],
    refunds: []
  };
}

function removeDuplicateBookings(state: AppState): AppState {
  if (!state.bookings || state.bookings.length === 0) {
    return state;
  }

  const originalCount = state.bookings.length;
  const bookingsByUserAndEvent = new Map<string, BookingRecord[]>();

  // Group bookings by a composite key of userId and eventId
  for (const booking of state.bookings) {
    const key = `${booking.userId}|${booking.eventId}`;
    if (!bookingsByUserAndEvent.has(key)) {
      bookingsByUserAndEvent.set(key, []);
    }
    bookingsByUserAndEvent.get(key)!.push(booking);
  }

  const uniqueBookings: BookingRecord[] = [];
  for (const userEventBookings of bookingsByUserAndEvent.values()) {
    const bookingsBySeats = new Map<string, BookingRecord[]>();

    // Further group these bookings by a sorted list of seat IDs
    for (const booking of userEventBookings) {
      const seatKey = booking.seats.slice().sort().join(',');
      if (!bookingsBySeats.has(seatKey)) {
        bookingsBySeats.set(seatKey, []);
      }
      bookingsBySeats.get(seatKey)!.push(booking);
    }

    // For each group of identical seat bookings, keep only the newest one
    for (const seatGroupBookings of bookingsBySeats.values()) {
      if (seatGroupBookings.length > 1) {
        // Sort by `updatedAt` descending to find the most recent booking
        seatGroupBookings.sort((a, b) => b.updatedAt - a.updatedAt);
        uniqueBookings.push(seatGroupBookings[0]); // Keep the newest
      } else {
        uniqueBookings.push(seatGroupBookings[0]); // Only one booking, it's unique
      }
    }
  }

  const newCount = uniqueBookings.length;
  if (originalCount > newCount) {
    console.log(`Removed ${originalCount - newCount} duplicate booking(s).`);
    state.bookings = uniqueBookings;
    writeDbSync(state); // Persist the cleaned state
  }

  return state;
}


// This is the singleton instance of our app's state.
// It's declared here so it can be exported and used by other modules.
let appState: AppState;

// This function initializes the state. It's called only once when the server starts.
function initializeState() {
  let stateFromDb = readDbSync();
  if (stateFromDb) {
    console.log('Successfully loaded state from db.json. Checking for duplicates...');
    stateFromDb = removeDuplicateBookings(stateFromDb);
    return stateFromDb;
  } else {
    console.log('No valid db.json found. Creating a new one with initial state.');
    const initialState = getInitialState();
    writeDbSync(initialState);
    return initialState;
  }
}

// In development, Next.js clears the cache on every file change, which would reset our state.
// To prevent this, we store the state in a global variable, which persists across hot reloads.
declare global {
  var __APP_STATE__: AppState | undefined;
}

if (process.env.NODE_ENV === 'production') {
  // In production, we initialize the state once.
  appState = initializeState();
} else {
  // In development, we check if the state is already in the global variable.
  // If not, we initialize it and store it there.
  if (!global.__APP_STATE__) {
    global.__APP_STATE__ = initializeState();
  }
  appState = global.__APP_STATE__;
}

// This is the function that all other parts of the app will call to save the state.
// It now uses the synchronous write function to ensure data is saved before proceeding.
export function saveState() {
  writeDbSync(appState);
}

export { appState };

export const requestState = {
  legacyGatewayRequests: [] as { path: string; method: string; ts: number; ip: string }[],
  rateLimit: new Map<string, { count: number; resetAt: number }>()
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