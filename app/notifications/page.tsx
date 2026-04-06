'use client';

import { useEffect, useState } from 'react';
import { getNotifications } from '@/lib/clientStore';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(getNotifications());

  useEffect(() => {
    setNotifications(getNotifications());
  }, []);

  return (
    <section className="modern-page stack-xl">
      <header className="modern-header">
        <h1>Alerts Center</h1>
        <p>Email / SMS / Push timeline from booking lifecycle.</p>
      </header>

      {notifications.length === 0 ? (
        <article className="modern-card">
          <p>No alerts yet. Once bookings happen, updates will appear here.</p>
        </article>
      ) : (
        <div className="modern-grid">
          {notifications.map((item, index) => (
            <article key={item.id} className="modern-card" style={{ animationDelay: `${index * 50}ms` }}>
              <p><strong>{item.channel}</strong></p>
              <p>{item.message}</p>
              <small>{new Date(item.ts).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
