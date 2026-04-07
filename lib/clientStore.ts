export type AppUser = { id: string; name: string; email: string; phone?: string; role: 'customer' | 'admin'; otpVerifiedAt: number | null };
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
const OTP_STATE_KEY = 'tp:otp-state';
const SESSION_LAST_ACTIVE_KEY = 'tp:session-last-active';
export const BOOKING_CANCEL_WINDOW_MS = 5 * 60 * 1000;
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

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
  const gmailUsers = users.filter((user) => user.email.toLowerCase().endsWith('@gmail.com')).map((user) => ({
    ...user,
    otpVerifiedAt: user.otpVerifiedAt || null
  }));
  if (gmailUsers.length !== users.length) {
    writeJson(USERS_KEY, gmailUsers);
  }
  return gmailUsers;
}

function isValidGmail(email: string): boolean {
  return /^[^\s@]+@gmail\.com$/i.test(email.trim());
}

function getOtpState() {
  return readJson<{ [email: string]: { code: string; expiresAt: number } }>(OTP_STATE_KEY, {});
}

function setOtpState(state: { [email: string]: { code: string; expiresAt: number } }) {
  writeJson(OTP_STATE_KEY, state);
}

export function requestOtp(email: string): { ok: boolean; error?: string; otpCode?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidGmail(cleanEmail)) return { ok: false, error: 'Only Gmail addresses are allowed.' };
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const state = getOtpState();
  state[cleanEmail] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };
  setOtpState(state);
  return { ok: true, otpCode: code };
}

function verifyOtp(email: string, otp: string): { ok: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const state = getOtpState();
  const match = state[cleanEmail];
  if (!match) return { ok: false, error: 'OTP not requested. Please request OTP.' };
  if (Date.now() > match.expiresAt) return { ok: false, error: 'OTP expired. Please request again.' };
  if (match.code !== otp.trim()) return { ok: false, error: 'Invalid OTP code.' };
  delete state[cleanEmail];
  setOtpState(state);
  return { ok: true };
}

export function registerUser(name: string, email: string, otp: string, role: AppUser['role'] = 'customer'): { user?: AppUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidGmail(cleanEmail)) return { error: 'Signup requires your original Gmail ID.' };
  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  const existing = users.find((user) => user.email.toLowerCase() === cleanEmail);
  if (existing) return { error: 'Email already registered. Please login.' };
  const otpStatus = verifyOtp(cleanEmail, otp);
  if (!otpStatus.ok) return { error: otpStatus.error };
  const nextUser: AppUser = { id: `U-${Date.now()}`, name: name.trim(), email: cleanEmail, role, otpVerifiedAt: Date.now() };
  writeJson(USERS_KEY, [...users, nextUser]);
  writeJson(ACTIVE_USER_KEY, nextUser);
  markSessionActivity();
  return { user: nextUser };
}

export function loginUser(email: string, otp: string): { user?: AppUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidGmail(cleanEmail)) return { error: 'Login requires a valid Gmail ID.' };
  const users = seedUsers(readJson<AppUser[]>(USERS_KEY, []));
  const existing = users.find((user) => user.email.toLowerCase() === cleanEmail);
  if (!existing) return { error: 'User not found. Please sign up first.' };
  const otpStatus = verifyOtp(cleanEmail, otp);
  if (!otpStatus.ok) return { error: otpStatus.error };
  const verifiedUser = { ...existing, otpVerifiedAt: existing.otpVerifiedAt || Date.now() };
  const nextUsers = users.map((user) => user.id === verifiedUser.id ? verifiedUser : user);
  writeJson(USERS_KEY, nextUsers);
  writeJson(ACTIVE_USER_KEY, verifiedUser);
  markSessionActivity();
  return { user: verifiedUser };
}

export function getActiveUser(): AppUser | null {
  const active = readJson<AppUser | null>(ACTIVE_USER_KEY, null);
  if (!active) return null;
  if (isSessionExpired()) {
    logoutUser();
    return null;
  }
  return active;
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_USER_KEY);
  localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
}

export function setActiveUser(user: AppUser): void {
  writeJson(ACTIVE_USER_KEY, user);
  markSessionActivity();
}

export function markSessionActivity(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
}

export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(SESSION_LAST_ACTIVE_KEY);
  if (!raw) return true;
  return Date.now() - Number(raw) > SESSION_TIMEOUT_MS;
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

export function canCancelBooking(createdAt: number): boolean {
  return Date.now() - createdAt <= BOOKING_CANCEL_WINDOW_MS;
}

export function cancelBooking(bookingId: string): { ok: boolean; error?: string } {
  const list = readJson<BookingRecord[]>(BOOKINGS_KEY, []);
  const target = list.find((booking) => booking.id === bookingId);
  if (!target) return { ok: false, error: 'Booking not found.' };
  if (!canCancelBooking(target.createdAt)) return { ok: false, error: 'Cancellation is only allowed within 5 minutes of booking.' };
  const next = list.map((booking) => booking.id === bookingId ? { ...booking, status: 'CANCELLED' as const, cancellable: false } : booking);
  writeJson(BOOKINGS_KEY, next);
  return { ok: true };
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
