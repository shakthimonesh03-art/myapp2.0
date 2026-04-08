import { json, serviceState } from '@/lib/serviceState';
import { persistServiceState } from '@/lib/serviceState';

export async function GET() {
  return json({ locations: serviceState.locations });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const city = String(body.city || '').trim();
    if (!city) return json({ error: 'city is required' }, 400);
    if (!serviceState.locations.includes(city)) {
      serviceState.locations.push(city);
      persistServiceState('locations.create', { city });
    }
    return json({ locations: serviceState.locations, added: city });
  } catch (error) {
    console.error('[locations] POST failed', error);
    return json({ error: 'Internal error while saving location' }, 500);
  }
}
