import { NextRequest } from 'next/server';
import { gatewayState, json } from '@/lib/serviceState';

const allowedServices = new Set(['auth', 'user', 'events', 'venues', 'inventory', 'bookings', 'payments', 'notifications', 'search', 'admin', 'reporting', 'storage']);
const protectedServices = new Set(['user', 'bookings', 'payments', 'admin', 'reporting']);

export async function OPTIONS() {
  return json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'POST');
}

async function proxy(req: NextRequest, path: string[], method: 'GET' | 'POST') {
  const [service, ...rest] = path;
  if (!service || !allowedServices.has(service)) return json({ error: 'Unknown service route' }, 404);

  const ip = req.headers.get('x-forwarded-for') || 'local';
  const limiter = gatewayState.rateLimit.get(ip) || { count: 0, resetAt: Date.now() + 60_000 };
  if (Date.now() > limiter.resetAt) {
    limiter.count = 0;
    limiter.resetAt = Date.now() + 60_000;
  }
  limiter.count += 1;
  gatewayState.rateLimit.set(ip, limiter);
  if (limiter.count > 120) return json({ error: 'Rate limit exceeded' }, 429);

  const version = req.headers.get('x-api-version') || req.nextUrl.searchParams.get('v') || 'v1';
  if (version !== 'v1') return json({ error: 'Unsupported API version', supported: 'v1' }, 400);

  if (protectedServices.has(service) && !req.headers.get('authorization')?.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token' }, 401);
  }

  const url = new URL(`/api/${service}/${rest.join('/')}`, req.url);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  gatewayState.requests.unshift({ path: `/${service}/${rest.join('/')}`, method, ts: Date.now(), ip });
  gatewayState.requests = gatewayState.requests.slice(0, 500);

  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (method === 'POST') init.body = await req.text();

  const response = await fetch(url, init);
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Api-Version': version } });
}
