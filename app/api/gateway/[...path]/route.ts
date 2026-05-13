import { NextRequest } from 'next/server';
import { json, requestState } from '@/lib/serviceState';

const allowedDomains = new Set(['auth', 'user', 'events', 'venues', 'inventory', 'bookings', 'payments', 'notifications', 'search', 'admin', 'reporting', 'storage']);
const protectedDomains = new Set(['user', 'bookings', 'payments', 'admin', 'reporting']);

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
  const [domain, ...rest] = path;
  if (!domain || !allowedDomains.has(domain)) return json({ error: 'Unknown API route' }, 404);

  const ip = req.headers.get('x-forwarded-for') || 'local';
  const limiter = requestState.rateLimit.get(ip) || { count: 0, resetAt: Date.now() + 60_000 };
  if (Date.now() > limiter.resetAt) {
    limiter.count = 0;
    limiter.resetAt = Date.now() + 60_000;
  }
  limiter.count += 1;
  requestState.rateLimit.set(ip, limiter);
  if (limiter.count > 120) return json({ error: 'Rate limit exceeded' }, 429);

  const version = req.headers.get('x-api-version') || req.nextUrl.searchParams.get('v') || 'v1';
  if (version !== 'v1') return json({ error: 'Unsupported API version', supported: 'v1' }, 400);

  if (protectedDomains.has(domain) && !req.headers.get('authorization')?.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token' }, 401);
  }

  const routeSuffix = rest.length ? `/${rest.join('/')}` : '';
  const url = new URL(`/api/${domain}${routeSuffix}`, req.url);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  requestState.legacyGatewayRequests.unshift({ path: `/${domain}${routeSuffix}`, method, ts: Date.now(), ip });
  requestState.legacyGatewayRequests = requestState.legacyGatewayRequests.slice(0, 500);

  const initHeaders: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  const authorization = req.headers.get('authorization');
  if (contentType) initHeaders['content-type'] = contentType;
  if (authorization) initHeaders.authorization = authorization;

  const init: RequestInit = { method, headers: initHeaders };
  if (method === 'POST') init.body = await req.text();

  const response = await fetch(url, init);
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Api-Version': version,
      'X-Legacy-Gateway': 'deprecated'
    }
  });
}
