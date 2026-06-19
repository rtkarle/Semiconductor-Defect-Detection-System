import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  RiDashboardLine, RiMicroscopeLine, RiHistoryLine,
  RiBarChartLine, RiFileList3Line, RiUserLine,
  RiLogoutBoxLine, RiMenuFoldLine, RiMenuUnfoldLine,
  RiCpuLine, RiBellLine,
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',        icon: RiDashboardLine },
  { to: '/inspect',    label: 'Upload Inspection', icon: RiMicroscopeLine },
  { to: '/history',    label: 'Scan History',      icon: RiHistoryLine },
  { to: '/analytics',  label: 'Analytics',         icon: RiBarChartLine },
  { to: '/reports',    label: 'Reports',            icon: RiFileList3Line },
  { to: '/profile',    label: 'Profile',            icon: RiUserLine },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full bg-slate-900 border-r border-slate-800/80',
        'transition-all duration-300 ease-spring flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Inner glow top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-700/40 to-transparent" />

      {/* Logo */}
      <div className={clsx(
        'flex items-center h-[70px] border-b border-slate-800/80 flex-shrink-0',
        'transition-all duration-300',
        collapsed ? 'px-4 justify-center' : 'px-4 gap-3'
      )}>
        {/* Icon with pulse ring */}
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl
                          flex items-center justify-center shadow-glow-blue
                          transition-transform duration-200 hover:scale-105">
            <RiCpuLine className="text-white text-lg" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full
                           border-2 border-slate-900 animate-pulse" />
        </div>

        {/* Name — fades out when collapsed */}
        <div className={clsx(
          'overflow-hidden transition-all duration-300',
          collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
        )}>
          <p className="text-sm font-bold text-white leading-tight whitespace-nowrap">SemiAI</p>
          <p className="text-xs text-slate-500 leading-tight whitespace-nowrap">Defect Detection</p>
        </div>

        {/* Toggle — slides to edge when collapsed */}
        <button
          onClick={onToggle}
          className={clsx(
            'btn-icon flex-shrink-0 transition-all duration-300',
            collapsed ? 'ml-0' : 'ml-auto'
          )}
          aria-label="Toggle sidebar"
        >
          {collapsed
            ? <RiMenuUnfoldLine size={17} />
            : <RiMenuFoldLine   size={17} />
          }
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            style={{ animationDelay: `${i * 40}ms` }}
            className={({ isActive }) => clsx(
              'nav-item group animate-slide-left',
              isActive && 'active',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon
              size={18}
              className={clsx(
                'flex-shrink-0 transition-transform duration-150',
                'group-hover:scale-110'
              )}
            />
            <span className={clsx(
              'sidebar-label whitespace-nowrap overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0 translate-x-2' : 'w-auto opacity-100 translate-x-0'
            )}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px bg-slate-800/80" />

      {/* Bottom section */}
      <div className="px-2 py-3 space-y-0.5">
        <NavLink
          to="/notifications"
          className={({ isActive }) => clsx(
            'nav-item group',
            isActive && 'active',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Notifications' : undefined}
        >
          <RiBellLine size={18} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          <span className={clsx(
            'sidebar-label whitespace-nowrap overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0 translate-x-2' : 'w-auto opacity-100 translate-x-0'
          )}>
            Notifications
          </span>
        </NavLink>

        <button
          onClick={handleLogout}
          className={clsx(
            'nav-item w-full text-left group',
            'hover:text-red-400 hover:bg-red-900/20',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <RiLogoutBoxLine size={18} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          <span className={clsx(
            'sidebar-label whitespace-nowrap overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0 translate-x-2' : 'w-auto opacity-100 translate-x-0'
          )}>
            Logout
          </span>
        </button>

        {/* User chip */}
        <div className={clsx(
          'overflow-hidden transition-all duration-300',
          collapsed ? 'h-0 opacity-0 mt-0' : 'h-auto opacity-100 mt-2'
        )}>
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 mx-0.5 rounded-xl
                            bg-slate-800/60 border border-slate-700/50">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-brand-800
                              flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-slate-500 capitalize leading-tight">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
    </aside>
  );
}
