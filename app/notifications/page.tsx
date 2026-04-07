'use client';

import { useEffect, useState } from 'react';
import { getActiveUser, getNotifications } from '@/lib/clientStore';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<{ id: string; channel: string; message: string; ts: number }[]>(getNotifications());

  useEffect(() => {
    const load = async () => {
      const user = getActiveUser();
      const serverRes = await fetch('/api/notifications');
      const serverData = await serverRes.json();
      const isAdmin = user?.role === 'admin';
      const server = (serverData.notifications || [])
        .filter((item: { userId: string; type: string }) => {
          if (isAdmin) return item.type === 'user_report';
          return (!user || item.userId === user.id) && item.type === 'new_event';
        })
        .map((item: { id: string; type: string; payload: string; sentAt: number }) => {
          let parsed: { message?: string; title?: string } = {};
          try { parsed = JSON.parse(item.payload || '{}'); } catch { parsed = {}; }
          return {
            id: `srv-${item.id}`,
            channel: 'BELL',
            message: parsed.message || parsed.title || item.type,
            ts: item.sentAt
          };
        });
      const local = isAdmin ? [] : getNotifications().filter((item) => item.channel === 'BELL');
      setNotifications([...server, ...local]);
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="modern-page stack-xl">
      <header className="modern-header">
        <h1>Notifications</h1>
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
