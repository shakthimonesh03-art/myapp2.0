export const events = [
  { id: 'ev1', title: 'Neon Nights Concert', city: 'Bengaluru', category: 'Music', venue: 'SkyDome Arena', datetime: '2026-05-10T19:30:00Z', basePrice: 1200 },
  { id: 'ev2', title: 'Standup Live: The Roast Room', city: 'Mumbai', category: 'Comedy', venue: 'Laugh Factory Hall', datetime: '2026-05-20T18:30:00Z', basePrice: 800 },
  { id: 'ev3', title: 'AI Product Summit 2026', city: 'Hyderabad', category: 'Tech', venue: 'TechPark Convention Center', datetime: '2026-06-02T09:30:00Z', basePrice: 2200 }
];

export const seatLayout: Record<string, { id: string; label: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' }[]> = {
  ev1: generateSeats('A', 32),
  ev2: generateSeats('B', 40),
  ev3: generateSeats('C', 36)
};

function generateSeats(prefix: string, total: number) {
  return Array.from({ length: total }).map((_, i) => ({
    id: `${prefix}${i + 1}`,
    label: `${prefix}${i + 1}`,
    status: i % 13 === 0 ? 'BOOKED' : 'AVAILABLE'
  }));
}
