import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({ venues: serviceState.venues });
}

export async function POST(req: Request) {
  const body = await req.json();
  const venue = { id: createId('v'), ...body };
  serviceState.venues.push(venue);
  return json({ venue }, 201);
}
