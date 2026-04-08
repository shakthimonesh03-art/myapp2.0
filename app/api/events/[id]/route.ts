import { json, serviceState } from '@/lib/serviceState';
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const event = serviceState.events.find((item) => item.id === params.id);
  return event ? json({ event }) : json({ error: 'Event not found' }, 404);
}
