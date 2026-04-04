'use client';

import { useEffect, useState } from 'react';
import { getNotifications } from '@/lib/clientStore';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(getNotifications());

  useEffect(() => {
    setNotifications(getNotifications());
  }, []);

  return (
    <section className="stack">
      <h1>Notifications</h1>
      <p className="muted">Email / SMS / Push notifications from booking lifecycle.</p>
      {notifications.length === 0 ? <p className="card">No notifications yet.</p> : (
        <div className="stack">
          {notifications.map((item) => (
            <article key={item.id} className="card row between center wrap">
              <div>
                <p><strong>{item.channel}</strong></p>
                <p>{item.message}</p>
              </div>
              <small>{new Date(item.ts).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
