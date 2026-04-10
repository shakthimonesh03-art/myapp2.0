import { NextRequest } from 'next/server';
import { gatewayState, json } from '@/lib/serviceState';

const allowedServices = new Set(['auth', 'user', 'events', 'venues', 'inventory', 'bookings', 'payments', 'notifications', 'search', 'admin', 'reporting', 'storage']);
const protectedServices = new Set(['user', 'bookings', 'payments', 'admin', 'reporting']);
const serviceBaseUrlByName: Record<string, string | undefined> = {
  auth: process.env.AUTH_SERVICE_URL,
  user: process.env.USER_SERVICE_URL,
  events: process.env.EVENTS_SERVICE_URL,
  venues: process.env.VENUES_SERVICE_URL,
  inventory: process.env.INVENTORY_SERVICE_URL,
  bookings: process.env.BOOKINGS_SERVICE_URL,
  payments: process.env.PAYMENTS_SERVICE_URL,
  notifications: process.env.NOTIFICATIONS_SERVICE_URL,
  search: process.env.SEARCH_SERVICE_URL,
  admin: process.env.ADMIN_SERVICE_URL,
  reporting: process.env.REPORTING_SERVICE_URL,
  storage: process.env.STORAGE_SERVICE_URL
};

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

  const serviceBase = serviceBaseUrlByName[service] || req.nextUrl.origin;
  const base = serviceBase.endsWith('/') ? serviceBase.slice(0, -1) : serviceBase;
  const pathSuffix = rest.length ? `/${rest.join('/')}` : '';
  const url = new URL(`${base}/api/${service}${pathSuffix}`);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  gatewayState.requests.unshift({ path: `/${service}/${rest.join('/')}`, method, ts: Date.now(), ip });
  gatewayState.requests = gatewayState.requests.slice(0, 500);

  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (method === 'POST') init.body = await req.text();

  const response = await fetch(url, init);
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Api-Version': version } });
}
