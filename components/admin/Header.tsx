'use client';

import { getActiveUser } from '@/lib/clientStore';

export function Header() {
  const user = getActiveUser();

  return (
    <header className="admin-header">
      <div>
        <h1>TicketPulse Admin Console</h1>
        <p>Production-ready management for operations and reporting.</p>
      </div>
      <div className="admin-user-pill">{user?.email || 'admin@ticketpulse.app'}</div>
    </header>
  );
}
