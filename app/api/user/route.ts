import { json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return json({ users: serviceState.users });
  const user = serviceState.users.find((item) => item.id === userId);
  return user ? json({ user }) : json({ error: 'User not found' }, 404);
}
