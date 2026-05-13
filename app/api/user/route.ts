import { appState, json } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return json({ users: appState.users });
  const user = appState.users.find((item) => item.id === userId);
  if (!user) return json({ error: 'User not found' }, 404);
  const bookingHistory = appState.bookings.filter((booking) => booking.userId === userId);
  return json({ user, bookingHistory, preferences: { city: user.cityPreference, savedCategories: ['Music', 'Comedy'] } });
}
