import { json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return json({ users: serviceState.users });
  const user = serviceState.users.find((item) => item.id === userId);
  if (!user) return json({ error: 'User not found' }, 404);
  const bookingHistory = serviceState.bookings.filter((booking) => booking.userId === userId);
  return json({ user, bookingHistory, preferences: { city: user.cityPreference, savedCategories: ['Music', 'Comedy'] } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const userId = String(body.userId || '');
  if (!userId) return json({ error: 'userId is required' }, 400);
  const user = serviceState.users.find((item) => item.id === userId);
  if (!user) return json({ error: 'User not found' }, 404);
  if (typeof body.name === 'string') user.name = body.name.trim() || user.name;
  if (typeof body.email === 'string') user.email = body.email.trim().toLowerCase();
  if (typeof body.phone === 'string' && body.phone.trim()) user.phone = body.phone.trim();
  return json({ user });
}
