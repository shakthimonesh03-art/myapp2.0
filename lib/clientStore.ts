export type AppUser = { id: string; name: string; email: string; password: string; role: 'customer' | 'admin' };
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
  s3Assets?: { ticketPdfUrl: string; qrImageUrl: string; invoiceUrl: string; logsUrl: string };
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

export function isEmailRegistered(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  return users.some((user) => user.email.toLowerCase() === cleanEmail);
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

export function updateUserName(userId: string, nextName: string): { user?: AppUser; error?: string } {
  const cleanName = nextName.trim();
  if (!cleanName) return { error: 'Name is required.' };

  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return { error: 'User not found.' };

  const updatedUser: AppUser = { ...users[index], name: cleanName };
  const nextUsers = [...users];
  nextUsers[index] = updatedUser;
  writeJson(USERS_KEY, nextUsers);

  const activeUser = readJson<AppUser | null>(ACTIVE_USER_KEY, null);
  if (activeUser?.id === updatedUser.id) {
    writeJson(ACTIVE_USER_KEY, updatedUser);
  }

  return { user: updatedUser };
}

export function updateUserPassword(email: string, nextPassword: string): { user?: AppUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = nextPassword.trim();
  if (!cleanEmail) return { error: 'Email is required.' };
  if (!cleanPassword) return { error: 'New password is required.' };

  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  const index = users.findIndex((user) => user.email.toLowerCase() === cleanEmail);
  if (index === -1) return { error: 'User not found. Please sign up first.' };

  const updatedUser: AppUser = { ...users[index], password: cleanPassword };
  const nextUsers = [...users];
  nextUsers[index] = updatedUser;
  writeJson(USERS_KEY, nextUsers);

  const activeUser = readJson<AppUser | null>(ACTIVE_USER_KEY, null);
  if (activeUser?.id === updatedUser.id) {
    writeJson(ACTIVE_USER_KEY, updatedUser);
  }

  return { user: updatedUser };
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
