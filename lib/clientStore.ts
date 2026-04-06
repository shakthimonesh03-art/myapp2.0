export type AppUser = { id: string; name: string; email: string; password: string; role: 'customer' | 'admin' };
export type BookingRecord = {
  id: string;
  userId: string;
  userEmail: string;
  eventId: string;
  eventTitle: string;
  seats: string[];
  amount: number;
  status: 'CONFIRMED' | 'CANCELLED';
  qr: string;
  createdAt: number;
  cancellable: boolean;
  s3Assets?: { ticketPdfUrl: string; qrImageUrl: string; invoiceUrl: string; logsUrl: string };
};

const USERS_KEY = 'tp:users';
const ACTIVE_USER_KEY = 'tp:active-user';
const BOOKINGS_KEY = 'tp:bookings';
const NOTIFICATION_KEY = 'tp:notifications';
const LOCATION_BY_USER_KEY = 'tp:location-by-user';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function seedUsers(users: AppUser[]) {
  if (users.length) return users;
  const adminUser: AppUser = { id: 'U-ADMIN', name: 'Platform Admin', email: 'admin@ticketpulse.app', password: 'admin123', role: 'admin' };
  writeJson(USERS_KEY, [adminUser]);
  return [adminUser];
}

export function registerUser(name: string, email: string, password: string, role: AppUser['role'] = 'customer'): { user?: AppUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  const existing = users.find((user) => user.email.toLowerCase() === cleanEmail);
  if (existing) return { error: 'Email already registered. Please login.' };
  const nextUser: AppUser = { id: `U-${Date.now()}`, name: name.trim(), email: cleanEmail, password, role };
  writeJson(USERS_KEY, [...users, nextUser]);
  writeJson(ACTIVE_USER_KEY, nextUser);
  return { user: nextUser };
}

export function loginUser(email: string, password: string): { user?: AppUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  const existing = users.find((user) => user.email.toLowerCase() === cleanEmail);
  if (!existing) return { error: 'User not found. Please sign up first.' };
  if (!existing.password || existing.password !== password) return { error: 'Invalid password.' };
  writeJson(ACTIVE_USER_KEY, existing);
  return { user: existing };
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
  const duplicate = list.find((item) => item.id === booking.id);
  if (duplicate) return;
  writeJson(BOOKINGS_KEY, [booking, ...list]);
}

export function getBookings(): BookingRecord[] {
  return readJson<BookingRecord[]>(BOOKINGS_KEY, []);
}

export function getBookingsForUser(userId: string): BookingRecord[] {
  return getBookings().filter((booking) => booking.userId === userId);
}

export function cancelBooking(bookingId: string): void {
  const list = readJson<BookingRecord[]>(BOOKINGS_KEY, []);
  const next = list.map((booking) => booking.id === bookingId ? { ...booking, status: 'CANCELLED' as const } : booking);
  writeJson(BOOKINGS_KEY, next);
}

export function setPreferredLocationForActiveUser(city: string): void {
  const user = getActiveUser();
  if (!user || !city) return;
  const map = readJson<Record<string, string>>(LOCATION_BY_USER_KEY, {});
  map[user.id] = city;
  writeJson(LOCATION_BY_USER_KEY, map);
}

export function getPreferredLocationForActiveUser(): string {
  const user = getActiveUser();
  if (!user) return '';
  const map = readJson<Record<string, string>>(LOCATION_BY_USER_KEY, {});
  return map[user.id] ?? '';
}

export function pushNotification(message: string, channel: 'EMAIL' | 'SMS' | 'PUSH'): void {
  const current = readJson<{ id: string; message: string; channel: string; ts: number }[]>(NOTIFICATION_KEY, []);
  current.unshift({ id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, message, channel, ts: Date.now() });
  writeJson(NOTIFICATION_KEY, current.slice(0, 30));
}

export function getNotifications() {
  return readJson<{ id: string; message: string; channel: string; ts: number }[]>(NOTIFICATION_KEY, []);
}
