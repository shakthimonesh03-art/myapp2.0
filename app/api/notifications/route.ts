import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({ notifications: serviceState.notifications });
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = { id: createId('ntf'), userId: body.userId, type: body.type, message: body.message, sentAt: Date.now() };
  serviceState.notifications.unshift(item);
  return json({ notification: item }, 201);
}
