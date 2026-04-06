import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container nav-shell">
            <Link href="/" className="brand">
              TicketPulse
              <span>Razorpay UPI Ready</span>
            </Link>
            <nav className="navlinks">
              <Link href="/">Events</Link>
              <Link href="/auth">Login</Link>
              <Link href="/bookings">Bookings</Link>
              <Link href="/notifications">Alerts</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="container page-wrap">{children}</main>
      </body>
    </html>
  );
}
