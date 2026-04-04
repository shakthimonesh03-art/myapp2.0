import { NextRequest } from 'next/server';
import { json } from '@/lib/serviceState';

const allowedServices = new Set([
  'auth', 'user', 'events', 'venues', 'inventory', 'bookings', 'payments', 'notifications', 'search', 'admin', 'reporting'
]);

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'POST');
}

async function proxy(req: NextRequest, path: string[], method: 'GET' | 'POST') {
  const [service, ...rest] = path;
  if (!service || !allowedServices.has(service)) return json({ error: 'Unknown service route' }, 404);
  const url = new URL(`/api/${service}/${rest.join('/')}`, req.url);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (method === 'POST') init.body = await req.text();

  const response = await fetch(url, init);
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
