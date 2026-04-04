export type AppUser = { id: string; name: string; email: string; role: 'customer' | 'admin' };
export type BookingRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  seats: string[];
  amount: number;
  status: 'CONFIRMED' | 'CANCELLED';
  qr: string;
  createdAt: number;
  cancellable: boolean;
};

const USERS_KEY = 'tp:users';
const ACTIVE_USER_KEY = 'tp:active-user';
const BOOKINGS_KEY = 'tp:bookings';
const NOTIFICATION_KEY = 'tp:notifications';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function registerUser(name: string, email: string): AppUser {
  const users = readJson<AppUser[]>(USERS_KEY, []);
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    writeJson(ACTIVE_USER_KEY, existing);
    return existing;
  }
  const nextUser: AppUser = { id: `U-${Date.now()}`, name, email, role: 'customer' };
  writeJson(USERS_KEY, [...users, nextUser]);
  writeJson(ACTIVE_USER_KEY, nextUser);
  return nextUser;
}

export function loginUser(email: string): AppUser | null {
  const users = readJson<AppUser[]>(USERS_KEY, []);
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (!existing) return null;
  writeJson(ACTIVE_USER_KEY, existing);
  return existing;
}

export function getActiveUser(): AppUser | null {
  return readJson<AppUser | null>(ACTIVE_USER_KEY, null);
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export function saveBooking(booking: BookingRecord): void {
  const list = readJson<BookingRecord[]>(BOOKINGS_KEY, []);
  writeJson(BOOKINGS_KEY, [booking, ...list]);
}

export function getBookings(): BookingRecord[] {
  return readJson<BookingRecord[]>(BOOKINGS_KEY, []);
}

export function cancelBooking(bookingId: string): void {
  const list = readJson<BookingRecord[]>(BOOKINGS_KEY, []);
  const next = list.map((booking) => booking.id === bookingId ? { ...booking, status: 'CANCELLED' as const } : booking);
  writeJson(BOOKINGS_KEY, next);
}

export function pushNotification(message: string, channel: 'EMAIL' | 'SMS' | 'PUSH'): void {
  const current = readJson<{ id: string; message: string; channel: string; ts: number }[]>(NOTIFICATION_KEY, []);
  current.unshift({ id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, message, channel, ts: Date.now() });
  writeJson(NOTIFICATION_KEY, current.slice(0, 30));
}

export function getNotifications() {
  return readJson<{ id: string; message: string; channel: string; ts: number }[]>(NOTIFICATION_KEY, []);
}
