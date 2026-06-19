import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />

        {/* Page area — key forces re-mount animation on route change */}
        <main
          key={pathname}
          className="flex-1 overflow-y-auto page-enter"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
