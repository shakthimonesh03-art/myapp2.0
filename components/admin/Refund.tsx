'use client';

import { useState } from 'react';
import { getBookings } from '@/lib/clientStore';

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export function RefundComponent() {
  const refundRequests = getBookings().filter((b) => b.status === 'CANCELLED');
  const [statusMap, setStatusMap] = useState<Record<string, RefundStatus>>(() =>
    Object.fromEntries(refundRequests.map((b) => [b.id, 'PENDING' as RefundStatus]))
  );

  const update = (id: string, status: RefundStatus) => setStatusMap((prev) => ({ ...prev, [id]: status }));

  return (
    <section className="admin-section stack">
      <h2>Refund Panel</h2>
      <table className="admin-table">
        <thead><tr><th>Booking ID</th><th>User</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {refundRequests.length === 0 && <tr><td colSpan={5}>No refund requests.</td></tr>}
          {refundRequests.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td><td>{b.userEmail}</td><td>₹{b.amount}</td>
              <td><span className={`status-badge ${statusMap[b.id] === 'APPROVED' ? 'ok' : statusMap[b.id] === 'REJECTED' ? 'warn' : ''}`}>{statusMap[b.id]}</span></td>
              <td className="row gap-sm">
                <button className="btn" onClick={() => update(b.id, 'APPROVED')}>Approve</button>
                <button className="btn ghost" onClick={() => update(b.id, 'REJECTED')}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
