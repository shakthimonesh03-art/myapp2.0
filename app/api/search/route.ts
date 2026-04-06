import { json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase();
  const city = searchParams.get('city');
  const date = searchParams.get('date');
  const category = searchParams.get('category');
  const minPrice = Number(searchParams.get('minPrice') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || Number.MAX_SAFE_INTEGER);

  const results = serviceState.events.filter((event) =>
    (!q || `${event.title} ${event.category} ${event.city}`.toLowerCase().includes(q))
    && (!city || event.city === city)
    && (!date || event.startTime.slice(0, 10) === date)
    && (!category || event.category === category)
    && ((event as { basePrice?: number }).basePrice || 1000) >= minPrice
    && ((event as { basePrice?: number }).basePrice || 1000) <= maxPrice
  );

  return json({ results, total: results.length, engine: 'elasticsearch-ready-mock' });
}
