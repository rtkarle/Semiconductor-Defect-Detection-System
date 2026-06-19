import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RiBellLine, RiArrowRightSLine } from 'react-icons/ri';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard':     ['Dashboard',        'Overview of your quality inspection metrics'],
  '/inspect':       ['Upload Inspection','Upload and scan semiconductor wafer images'],
  '/history':       ['Scan History',     'Browse and manage all inspection records'],
  '/analytics':     ['Analytics',        'Defect trends, charts, and quality scores'],
  '/reports':       ['Reports',          'Download and manage PDF inspection reports'],
  '/profile':       ['My Profile',       'Account settings and security'],
  '/notifications': ['Notifications',    'Alerts and system messages'],
};

export default function Navbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread]     = useState(0);
  const [bellAnim, setBellAnim] = useState(false);

  const [title, subtitle] = PAGE_TITLES[pathname] ||
    (pathname.startsWith('/history/') ? ['Scan Detail', 'Defect analysis and recommendations'] : ['SemiAI', '']);

  useEffect(() => {
    const fetch = () =>
      notificationsAPI.unreadCount()
        .then((r) => {
          const count = r.data.unread_count || 0;
          if (count > unread && unread !== 0) setBellAnim(true);
          setUnread(count);
          setTimeout(() => setBellAnim(false), 600);
        })
        .catch(() => {});

    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  return (
    <header className="h-[70px] glass-dark border-b border-slate-800/80
                        flex items-center px-5 gap-4 sticky top-0 z-10
                        transition-all duration-200">
      {/* Breadcrumb */}
      <div className="flex-1 min-w-0 animate-fade-in" key={pathname}>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
          <span>SemiAI</span>
          <RiArrowRightSLine />
          <span className="text-slate-400">{title}</span>
        </div>
        <h1 className="text-base font-bold text-slate-100 leading-tight truncate">{title}</h1>
      </div>

      {/* Right zone */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <Link
          to="/notifications"
          className="relative btn-icon"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          data-tooltip={unread > 0 ? `${unread} unread` : 'Notifications'}
        >
          <RiBellLine
            size={19}
            className={bellAnim ? 'animate-[wiggle_0.4s_ease]' : ''}
          />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5
                             bg-red-600 rounded-full text-[10px] font-bold text-white
                             flex items-center justify-center notif-dot
                             animate-scale-in">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-800 mx-1" />

        {/* User */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
                     hover:bg-slate-800/80 transition-all duration-150 group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800
                          flex items-center justify-center text-xs font-bold text-white
                          shadow-glow-blue transition-transform duration-150
                          group-hover:scale-105">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-semibold text-slate-200 leading-none">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 capitalize mt-0.5">{user?.role}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
