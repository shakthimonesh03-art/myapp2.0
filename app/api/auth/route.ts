import { appState, createId, hashPassword, json } from '@/lib/serviceState';
import { getPingramEmailConfigError, resolvePingramOtpNotificationType, sendPingramEmailNotification } from '@/lib/pingram';

type SignupOtpRecord = { otp: string; expiresAt: number; attempts: number };
type PasswordResetRecord = { otp: string; expiresAt: number; attempts: number };

const signupOtpState = new Map<string, SignupOtpRecord>();
const passwordResetState = new Map<string, PasswordResetRecord>();

function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createOtp(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function resolveOtpExpiryMinutes(): number {
  const minutes = Number(process.env.SIGNUP_OTP_EXPIRY_MINUTES || 10);
  if (!Number.isFinite(minutes) || minutes < 1) return 10;
  if (minutes > 30) return 30;
  return Math.floor(minutes);
}

function resolveOtpMaxAttempts(): number {
  const attempts = Number(process.env.SIGNUP_OTP_MAX_ATTEMPTS || 5);
  if (!Number.isFinite(attempts) || attempts < 1) return 5;
  if (attempts > 10) return 10;
  return Math.floor(attempts);
}

async function sendSignupOtpEmail(email: string, otp: string, expiryMinutes: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const configError = getPingramEmailConfigError();

  if (configError) {
    return { ok: false, error: configError };
  }

  const emailHtml = `<p>Your TicketPulse signup OTP is <strong>${otp}</strong>.</p><p>This OTP expires in ${expiryMinutes} minute(s).</p>`;
  const notificationType = resolvePingramOtpNotificationType();

  const sendResult = await sendPingramEmailNotification({
    toEmail: email,
    type: notificationType,
    subject: 'Your TicketPulse Signup OTP',
    html: emailHtml
  });

  if (!sendResult.ok) {
    return sendResult;
  }

  return { ok: true };
}

async function sendPasswordResetEmail(email: string, resetCode: string, expiryMinutes: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const configError = getPingramEmailConfigError();

  if (configError) {
    return { ok: false, error: configError };
  }

  const emailHtml = `<p>Your TicketPulse password reset code is <strong>${resetCode}</strong>.</p><p>This code expires in ${expiryMinutes} minute(s).</p>`;
  const notificationType = resolvePingramOtpNotificationType();

  const sendResult = await sendPingramEmailNotification({
    toEmail: email,
    type: notificationType,
    subject: 'TicketPulse Password Reset Code',
    html: emailHtml
  });

  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error.replace('OTP', 'password reset') };
  }

  return { ok: true };
}

export async function OPTIONS() {
  return json({ ok: true });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'send-signup-otp') {
    const email = normalizeEmail(body.email);
    if (!email || !isValidEmail(email)) return json({ error: 'Please provide a valid email address.' }, 400);

    const existsInState = appState.users.some((user) => user.email.toLowerCase() === email);
    if (existsInState) return json({ error: 'Email already exists' }, 409);

    const expiryMinutes = resolveOtpExpiryMinutes();
    const otp = createOtp();
    signupOtpState.set(email, { otp, expiresAt: Date.now() + expiryMinutes * 60 * 1000, attempts: 0 });

    const sendResult = await sendSignupOtpEmail(email, otp, expiryMinutes);
    if (!sendResult.ok) {
      signupOtpState.delete(email);
      return json({ error: sendResult.error }, 500);
    }

    return json({ message: 'OTP sent to your email address.', expiresInMinutes: expiryMinutes });
  }

  if (body.action === 'verify-signup-otp') {
    const email = normalizeEmail(body.email);
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
    if (!email || !otp) return json({ error: 'Email and OTP are required.' }, 400);

    const otpRecord = signupOtpState.get(email);
    if (!otpRecord) return json({ error: 'No active OTP found for this email. Request a new OTP.' }, 404);

    if (otpRecord.expiresAt < Date.now()) {
      signupOtpState.delete(email);
      return json({ error: 'OTP expired. Request a new OTP.' }, 410);
    }

    const maxAttempts = resolveOtpMaxAttempts();
    if (otpRecord.attempts >= maxAttempts) {
      signupOtpState.delete(email);
      return json({ error: 'Too many invalid OTP attempts. Request a new OTP.' }, 429);
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      signupOtpState.set(email, otpRecord);
      return json({ error: 'Invalid OTP. Please try again.' }, 401);
    }

    signupOtpState.delete(email);
    return json({ verified: true, message: 'OTP verified successfully.' });
  }

  if (body.action === 'signup') {
    if (appState.users.find((user) => user.email === body.email)) return json({ error: 'Email already exists' }, 409);
    const user = {
      id: createId('u'),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      role: body.role || 'customer',
      cityPreference: body.cityPreference || '',
      passwordHash: hashPassword(body.password || 'changeme'),
      createdAt: Date.now()
    };
    appState.users.push(user);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

  if (body.action === 'login') {
    const user = appState.users.find((item) => item.email === body.email);
    if (!user || user.passwordHash !== hashPassword(body.password || '')) return json({ error: 'Invalid credentials' }, 401);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

  if (body.action === 'refresh') {
    return json({ accessToken: createId('jwt') });
  }

  if (body.action === 'forgot-password') {
    const email = normalizeEmail(body.email);
    if (!email || !isValidEmail(email)) return json({ error: 'Please provide a valid email address.' }, 400);

    const resetCode = createOtp();
    passwordResetState.set(email, { otp: resetCode, expiresAt: Date.now() + resolveOtpExpiryMinutes() * 60 * 1000, attempts: 0 });

    const expiryMinutes = resolveOtpExpiryMinutes();
    const sendResult = await sendPasswordResetEmail(email, resetCode, expiryMinutes);
    if (!sendResult.ok) {
      passwordResetState.delete(email);
      return json({ error: sendResult.error }, 500);
    }

    return json({ message: 'Password reset code sent to your email.', expiresInMinutes: expiryMinutes });
  }

  if (body.action === 'reset-password') {
    const email = normalizeEmail(body.email);
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
    const nextPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!email || !isValidEmail(email)) return json({ error: 'Please provide a valid email address.' }, 400);
    if (!otp) return json({ error: 'OTP is required.' }, 400);
    if (!nextPassword.trim()) return json({ error: 'New password is required.' }, 400);

    const resetRecord = passwordResetState.get(email);
    if (!resetRecord) return json({ error: 'No active reset request found. Request a new OTP.' }, 404);

    if (resetRecord.expiresAt < Date.now()) {
      passwordResetState.delete(email);
      return json({ error: 'Reset OTP expired. Request a new OTP.' }, 410);
    }

    const maxAttempts = resolveOtpMaxAttempts();
    if (resetRecord.attempts >= maxAttempts) {
      passwordResetState.delete(email);
      return json({ error: 'Too many invalid OTP attempts. Request a new OTP.' }, 429);
    }

    if (resetRecord.otp !== otp) {
      resetRecord.attempts += 1;
      passwordResetState.set(email, resetRecord);
      return json({ error: 'Invalid OTP. Please try again.' }, 401);
    }

    const user = appState.users.find((item) => item.email.toLowerCase() === email);
    if (user) user.passwordHash = hashPassword(nextPassword);

    passwordResetState.delete(email);
    return json({ message: 'Password reset successful.', reset: true });
  }

  return json({ error: 'Unsupported action' }, 400);
}
