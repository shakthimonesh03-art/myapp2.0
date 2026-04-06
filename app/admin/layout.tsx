'use client';

import { ReactNode, useEffect, useState } from 'react';
import { getActiveUser } from '@/lib/clientStore';
import { Sidebar } from '@/components/admin/Sidebar';
import { Header } from '@/components/admin/Header';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = getActiveUser();
    setIsAdmin(user?.role === 'admin');
  }, []);

  if (!isAdmin) {
    return (
      <section className="modern-page stack-xl">
        <header className="modern-header">
          <h1>Access denied</h1>
          <p>Admin pages are visible only to admin users.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <Sidebar />
      <div className="admin-main">
        <Header />
        {children}
      </div>
    </section>
  );
}
