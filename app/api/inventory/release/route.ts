import { POST as inventoryPost } from '@/app/api/inventory/route';
export async function POST(req: Request) {
  const body = await req.json();
  return inventoryPost(new Request(req.url, { method: 'POST', body: JSON.stringify({ ...body, action: 'release' }) }));
}
