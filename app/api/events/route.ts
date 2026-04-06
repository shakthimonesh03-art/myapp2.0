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
    if (body.city && !serviceState.locations.includes(body.city)) serviceState.locations.push(body.city);
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
    serviceState.users.forEach((user) => {
      serviceState.notifications.unshift({
        id: createId('ntf'),
        userId: user.id,
        type: 'new_event',
        status: 'SENT',
        payload: JSON.stringify({ title: event.title, city: event.city, eventId: event.id, message: `New event added: ${event.title}` }),
        sentAt: Date.now()
      });
    });
    return json({ event }, 201);
  }

  if (body.action === 'update') {
    const event = serviceState.events.find((item) => item.id === body.eventId);
    if (!event) return json({ error: 'Event not found' }, 404);
    if (body.updates?.city && !serviceState.locations.includes(body.updates.city)) serviceState.locations.push(body.updates.city);
    Object.assign(event, body.updates || {});
    return json({ event });
  }

  if (body.action === 'publish') {
    const event = serviceState.events.find((item) => item.id === body.eventId);
    if (!event) return json({ error: 'Event not found' }, 404);
    event.status = body.publish ? 'PUBLISHED' : 'UNPUBLISHED';
    return json({ event });
  }

  if (body.action === 'delete') {
    const index = serviceState.events.findIndex((item) => item.id === body.eventId);
    if (index === -1) return json({ error: 'Event not found' }, 404);
    const [event] = serviceState.events.splice(index, 1);
    delete serviceState.seats[event.id];
    return json({ event, deleted: true });
  }

  return json({ error: 'Unsupported action' }, 400);
}
