import { POST as authPost } from '@/app/api/auth/route';
export async function POST(req: Request) {
  return authPost(new Request(req.url, { method: 'POST', body: JSON.stringify({ action: 'refresh' }) }));
}
