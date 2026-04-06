import { json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({ locations: serviceState.locations });
}

export async function POST(req: Request) {
  const body = await req.json();
  const city = String(body.city || '').trim();
  if (!city) return json({ error: 'city is required' }, 400);
  if (!serviceState.locations.includes(city)) serviceState.locations.push(city);
  return json({ locations: serviceState.locations, added: city });
}
