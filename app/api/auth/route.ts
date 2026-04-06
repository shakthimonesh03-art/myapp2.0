import { createId, hashPassword, json, serviceState } from '@/lib/serviceState';

export async function OPTIONS() {
  return json({ ok: true });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'signup') {
    if (serviceState.users.find((user) => user.email === body.email)) return json({ error: 'Email already exists' }, 409);
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
    serviceState.users.push(user);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

  if (body.action === 'login') {
    const user = serviceState.users.find((item) => item.email === body.email);
    if (!user || user.passwordHash !== hashPassword(body.password || '')) return json({ error: 'Invalid credentials' }, 401);
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
