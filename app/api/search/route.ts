import { json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase();
  const city = searchParams.get('city');
  const date = searchParams.get('date');
  const category = searchParams.get('category');
  const results = serviceState.events.filter((event) =>
    (!q || `${event.title} ${event.category} ${event.city}`.toLowerCase().includes(q))
    && (!city || event.city === city)
    && (!date || event.date === date)
    && (!category || event.category === category)
  );
  return json({ results, total: results.length });
}
