import { POST as adminPost } from '@/app/api/admin/route';
export async function POST(req: Request) {
  const body = await req.json();
  return adminPost(new Request(req.url, { method: 'POST', body: JSON.stringify({ action: 'create-venue', ...body }) }));
}
