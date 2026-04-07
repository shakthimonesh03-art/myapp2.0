import { createId, hashPassword, json, serviceState } from '@/lib/serviceState';

const otpState = new Map<string, { code: string; expiresAt: number }>();

function isValidGmail(email: string) {
  return /^[^\s@]+@gmail\.com$/i.test(String(email || '').trim());
}

export async function OPTIONS() {
  return json({ ok: true });
}

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || '').trim().toLowerCase();

  if (body.action === 'request-otp') {
    if (!isValidGmail(email)) return json({ error: 'Only Gmail IDs are allowed' }, 400);
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    otpState.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    return json({ message: 'OTP sent', otpCode: code });
  }

  if (body.action === 'signup') {
    if (!isValidGmail(email)) return json({ error: 'Only Gmail IDs are allowed' }, 400);
    const otpRecord = otpState.get(email);
    if (!otpRecord || otpRecord.code !== String(body.otp || '').trim() || Date.now() > otpRecord.expiresAt) {
      return json({ error: 'Invalid or expired OTP' }, 401);
    }
    otpState.delete(email);
    if (serviceState.users.find((user) => user.email === email)) return json({ error: 'Email already exists' }, 409);
    const user = {
      id: createId('u'),
      name: body.name,
      email,
      phone: body.phone || '',
      role: body.role || 'customer',
      cityPreference: body.cityPreference || '',
      passwordHash: hashPassword('otp-auth'),
      createdAt: Date.now(),
      otpVerifiedAt: Date.now()
    };
    serviceState.users.push(user);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

  if (body.action === 'login') {
    if (!isValidGmail(email)) return json({ error: 'Only Gmail IDs are allowed' }, 400);
    const otpRecord = otpState.get(email);
    if (!otpRecord || otpRecord.code !== String(body.otp || '').trim() || Date.now() > otpRecord.expiresAt) {
      return json({ error: 'Invalid or expired OTP' }, 401);
    }
    otpState.delete(email);
    const user = serviceState.users.find((item) => item.email === email);
    if (!user) return json({ error: 'User not found. Please sign up.' }, 404);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

  if (body.action === 'refresh') {
    return json({ accessToken: createId('jwt') });
  }

  if (body.action === 'forgot-password') {
    return json({ message: 'Password reset link generated (mock).' });
  }

  return json({ error: 'Unsupported action' }, 400);
}
