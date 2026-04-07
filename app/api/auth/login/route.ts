import { POST as authPost } from '@/app/api/auth/route';
export async function POST(req: Request) {
  const body = await req.json();
  return authPost(new Request(req.url, { method: 'POST', body: JSON.stringify({ ...body, action: 'login' }) }));
}
