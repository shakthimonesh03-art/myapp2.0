export type EventCard = {
  id: string;
  title: string;
  city: string;
  category: string;
  venue: string;
  datetime: string;
  basePrice: number;
  venueLayout: string;
  imageUrl: string;
};

export const events: EventCard[] = [
  {
    id: 'ev1',
    title: 'Neon Nights Concert',
    city: 'Bengaluru',
    category: 'Music',
    venue: 'SkyDome Arena',
    datetime: '2026-05-10T19:30:00Z',
    basePrice: 5,
    venueLayout: 'Main floor + Balcony. Gates open 6:15 PM.',
    imageUrl: 'https://unsplash.com/photos/QOajY0MNp8Y/download?force=true&w=1600'
  },
  {
    id: 'ev2',
    title: 'Standup Live: The Roast Room',
    city: 'Mumbai',
    category: 'Comedy',
    venue: 'Laugh Factory Hall',
    datetime: '2026-05-20T18:30:00Z',
    basePrice: 5,
    venueLayout: 'Single hall theater seating. Doors open 5:45 PM.',
    imageUrl: 'https://unsplash.com/photos/ugRPTKqcNyU/download?force=true&w=1600'
  },
  {
    id: 'ev3',
    title: 'AI Product Summit 2026',
    city: 'Hyderabad',
    category: 'Tech',
    venue: 'TechPark Convention Center',
    datetime: '2026-06-02T09:30:00Z',
    basePrice: 5,
    venueLayout: 'Expo section + keynote arena + workshop wings.',
    imageUrl: 'https://unsplash.com/photos/AsxOJcsaR4g/download?force=true&w=1600'
  }
];

export const venueCatalog = [
  { id: 'v1', name: 'SkyDome Arena', city: 'Bengaluru', capacity: 1800 },
  { id: 'v2', name: 'Laugh Factory Hall', city: 'Mumbai', capacity: 620 },
  { id: 'v3', name: 'TechPark Convention Center', city: 'Hyderabad', capacity: 2400 }
];

export const seatLayout: Record<string, { id: string; label: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' }[]> = {
  ev1: generateSeats('A', 32),
  ev2: generateSeats('B', 40),
  ev3: generateSeats('C', 36)
};

function generateSeats(prefix: string, total: number): { id: string; label: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' }[] {
  return Array.from({ length: total }).map((_, i) => ({
    id: `${prefix}${i + 1}`,
    label: `${prefix}${i + 1}`,
    status: i % 13 === 0 ? 'BOOKED' : 'AVAILABLE'
  }));
}
