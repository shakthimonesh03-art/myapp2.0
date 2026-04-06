import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const date = searchParams.get('date');
  const events = serviceState.events.filter((event) =>
    (!city || event.city === city)
    && (!category || event.category === category)
    && (!date || event.startTime.slice(0, 10) === date)
  );
  return json({ events });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'create') {
    const event = {
      id: createId('ev'),
      title: body.title,
      description: body.description || '',
      category: body.category,
      language: body.language || 'English',
      bannerUrl: body.bannerUrl || '',
      startTime: body.startTime,
      endTime: body.endTime,
      city: body.city,
      venueId: body.venueId,
      status: 'DRAFT',
      organizerId: body.organizerId || 'org-default',
      ageRestriction: body.ageRestriction || 'All',
      cancellationPolicy: body.cancellationPolicy || 'No cancellation'
    };
    serviceState.events.push(event);
    return json({ event }, 201);
  }

  if (body.action === 'update') {
    const event = serviceState.events.find((item) => item.id === body.eventId);
    if (!event) return json({ error: 'Event not found' }, 404);
    Object.assign(event, body.updates || {});
    return json({ event });
  }

  if (body.action === 'publish') {
    const event = serviceState.events.find((item) => item.id === body.eventId);
    if (!event) return json({ error: 'Event not found' }, 404);
    event.status = body.publish ? 'PUBLISHED' : 'UNPUBLISHED';
    return json({ event });
  }

  return json({ error: 'Unsupported action' }, 400);
}
