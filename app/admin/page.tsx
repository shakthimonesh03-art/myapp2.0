import { events } from '@/lib/mockData';

export default function AdminPage() {
  return (
    <section className="stack">
      <h1>Admin dashboard</h1>
      <div className="grid three">
        <article className="card"><h3>Events</h3><p>{events.length} published</p></article>
        <article className="card"><h3>Bookings</h3><p>Live monitor (demo): 128</p></article>
        <article className="card"><h3>Refunds</h3><p>Pending: 3</p></article>
      </div>
      <article className="card">
        <h3>Upcoming events</h3>
        <ul>
          {events.map((event) => (
            <li key={event.id}>{event.title} • {event.city} • {event.category}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
