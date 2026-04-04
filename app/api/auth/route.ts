import { createId, json, serviceState } from '@/lib/serviceState';

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'signup') {
    if (serviceState.users.find((user) => user.email === body.email)) return json({ error: 'Email already exists' }, 409);
    const user = { id: createId('u'), name: body.name, email: body.email, role: 'customer' };
    serviceState.users.push(user);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('rt') });
  }

  if (body.action === 'login') {
    const user = serviceState.users.find((item) => item.email === body.email);
    if (!user) return json({ error: 'Invalid credentials' }, 401);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('rt') });
  }

  return json({ error: 'Unsupported action' }, 400);
}
