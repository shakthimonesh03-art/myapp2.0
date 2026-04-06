import { POST as eventsPost } from '@/app/api/events/route';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  return eventsPost(new Request(req.url, { method: 'POST', body: JSON.stringify({ action: 'update', eventId: params.id, updates: body }) }));
}
