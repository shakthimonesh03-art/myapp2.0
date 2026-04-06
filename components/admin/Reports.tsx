'use client';

import { useEffect, useState } from 'react';

export function ReportsComponent() {
  const [reports, setReports] = useState({ bookingReports: 0, revenueReports: 0 });
  const [byStatus, setByStatus] = useState({ confirmed: 0, cancelled: 0, users: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const [reportRes, bookingRes] = await Promise.all([fetch('/api/reporting'), fetch('/api/bookings?admin=1')]);
        const reportData = reportRes.ok ? await reportRes.json() : { bookingReports: 0, revenueReports: 0 };
        const bookingData = bookingRes.ok ? await bookingRes.json() : { bookings: [] };
        const all = bookingData.bookings || [];
        setReports(reportData);
        setByStatus({
          confirmed: all.filter((b: { status: string }) => b.status === 'CONFIRMED').length,
          cancelled: all.filter((b: { status: string }) => b.status === 'CANCELLED').length,
          users: new Set(all.map((b: { userId: string }) => b.userId)).size
        });
      } catch {
        setError('Unable to load reports. Retrying...');
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="admin-section stack">
      <h2>Reports Dashboard</h2>
      {error && <p className="muted">{error}</p>}
      <div className="admin-card-grid three">
        <article className="admin-card"><h3>User Activity Reports</h3><p>Active users: {byStatus.users}</p></article>
        <article className="admin-card"><h3>Booking Reports</h3><p>Confirmed: {byStatus.confirmed} • Cancelled: {byStatus.cancelled}</p></article>
        <article className="admin-card"><h3>Revenue Reports</h3><p>Total Revenue: ₹{reports.revenueReports}</p></article>
      </div>
      <div className="admin-chart">
        <div className="admin-bar-wrap"><div className="admin-bar" style={{ height: `${Math.max(14, byStatus.confirmed * 16)}px` }} /><small>Confirmed</small></div>
        <div className="admin-bar-wrap"><div className="admin-bar" style={{ height: `${Math.max(14, byStatus.cancelled * 16)}px` }} /><small>Cancelled</small></div>
        <div className="admin-bar-wrap"><div className="admin-bar" style={{ height: `${Math.max(14, Math.round(reports.revenueReports / 5000) * 12)}px` }} /><small>Revenue</small></div>
      </div>
    </section>
  );
}
