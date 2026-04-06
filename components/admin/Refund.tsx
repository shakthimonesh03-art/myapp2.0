'use client';

import { useEffect, useState } from 'react';

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export function RefundComponent() {
  const [refundRequests, setRefundRequests] = useState<{ id: string; userId: string; totalAmount: number; status: string }[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, RefundStatus>>(() =>
    ({})
  );

  const load = async () => {
    const res = await fetch('/api/bookings?admin=1');
    const data = await res.json();
    const cancelled = (data.bookings || []).filter((b: { status: string }) => b.status === 'CANCELLED');
    setRefundRequests(cancelled);
    setStatusMap((prev) => {
      const next = { ...prev };
      cancelled.forEach((b: { id: string }) => { if (!next[b.id]) next[b.id] = 'PENDING'; });
      return next;
    });
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const update = async (id: string, status: RefundStatus, amount: number) => {
    if (status === 'APPROVED') {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refund', bookingId: id, amount })
      });
    }
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  };

  return (
    <section className="admin-section stack">
      <h2>Refund Panel</h2>
      <table className="admin-table">
        <thead><tr><th>Booking ID</th><th>User</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {refundRequests.length === 0 && <tr><td colSpan={5}>No refund requests.</td></tr>}
          {refundRequests.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td><td>{b.userId}</td><td>₹{b.totalAmount}</td>
              <td><span className={`status-badge ${statusMap[b.id] === 'APPROVED' ? 'ok' : statusMap[b.id] === 'REJECTED' ? 'warn' : ''}`}>{statusMap[b.id]}</span></td>
              <td className="row gap-sm">
                <button className="btn" onClick={() => update(b.id, 'APPROVED', b.totalAmount)}>Approve</button>
                <button className="btn ghost" onClick={() => update(b.id, 'REJECTED', b.totalAmount)}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
