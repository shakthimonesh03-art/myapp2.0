import { json, serviceState } from '@/lib/serviceState';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase();
  const city = searchParams.get('city') || '';
  const date = searchParams.get('date') || '';
  const genre = searchParams.get('genre') || '';
  const language = searchParams.get('language') || '';
  const minPrice = Number(searchParams.get('minPrice') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || Number.MAX_SAFE_INTEGER);
  const availability = searchParams.get('availability');

  const results = serviceState.events.filter((event) => {
    const eventAny = event as typeof event & { tags?: string[]; venueName?: string; basePrice?: number };
    const venue = serviceState.venues.find((item) => item.id === event.venueId);
    const availableCount = (serviceState.seats[event.id] || []).filter((seat) => seat.status === 'AVAILABLE').length;
    const searchDoc = [
      event.title,
      event.city,
      venue?.name || eventAny.venueName || '',
      event.category,
      event.description || '',
      ...(eventAny.tags || [])
    ].join(' ').toLowerCase();
    const price = eventAny.basePrice || Math.min(...(serviceState.seats[event.id] || []).map((seat) => seat.price)) || 0;

    return (!q || searchDoc.includes(q))
      && (!city || event.city.toLowerCase() === city.toLowerCase())
      && (!date || event.startTime.slice(0, 10) === date)
      && (!genre || event.category.toLowerCase() === genre.toLowerCase())
      && (!language || event.language.toLowerCase() === language.toLowerCase())
      && price >= minPrice
      && price <= maxPrice
      && (!availability || (availability === 'available' ? availableCount > 0 : availableCount === 0));
  });

  return json({
    results,
    total: results.length,
    strategy: {
      engine: 'elasticsearch-ready-mock',
      searchableFields: ['title', 'city', 'venue', 'category', 'tags', 'description'],
      filters: ['city', 'date', 'genre', 'language', 'price', 'availability']
    }
  });
}
