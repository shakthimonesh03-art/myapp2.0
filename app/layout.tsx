import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container row between center wrap">
            <Link href="/" className="brand">TicketPulse</Link>
            <nav className="row gap-sm wrap navlinks">
              <Link href="/">Events</Link>
              <Link href="/auth">Login / Signup</Link>
              <Link href="/bookings">My bookings</Link>
              <Link href="/notifications">Notifications</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
