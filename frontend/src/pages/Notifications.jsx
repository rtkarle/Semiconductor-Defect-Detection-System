import React, { useEffect, useState, useCallback } from 'react';
import {
  RiBellLine, RiCheckDoubleLine, RiDeleteBinLine,
  RiAlertLine, RiFileList3Line, RiInformationLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../services/api';
import { PageLoader } from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { timeAgo } from '../utils/helpers';
import clsx from 'clsx';

const TYPE_CONFIG = {
  critical_defect: { icon: RiAlertLine,       color: 'text-red-400',    bg: 'bg-red-900/30'    },
  report_ready:    { icon: RiFileList3Line,    color: 'text-green-400',  bg: 'bg-green-900/30'  },
  system:          { icon: RiInformationLine,  color: 'text-brand-400',  bg: 'bg-brand-900/30'  },
  info:            { icon: RiInformationLine,  color: 'text-slate-400',  bg: 'bg-slate-800'     },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // all | unread

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.list({ unread_only: filter === 'unread', page_size: 50 });
      setNotifications(res.data || []);
    } catch { toast.error('Failed to load notifications.'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All marked as read.');
    } catch { toast.error('Failed.'); }
  };

  const markRead = async (n) => {
    if (n.is_read) return;
    try {
      await notificationsAPI.markRead([n.id]);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    } catch {}
  };

  const deleteNotif = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { toast.error('Failed to delete.'); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page-container space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="section-title">Notifications</h2>
          <p className="section-subtitle">{unreadCount} unread</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {['all', 'unread'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx('px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === f ? 'bg-brand-700 text-white' : 'text-slate-400 hover:text-slate-200')}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm py-1.5">
              <RiCheckDoubleLine /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? <PageLoader /> : notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            return (
              <div
                key={n.id}
                onClick={() => markRead(n)}
                className={clsx(
                  'card flex items-start gap-4 cursor-pointer transition-all duration-150',
                  !n.is_read ? 'border-brand-800/50 bg-brand-900/5' : 'hover:border-slate-700'
                )}
              >
                <div className={clsx('p-2.5 rounded-xl flex-shrink-0 mt-0.5', cfg.bg)}>
                  <cfg.icon className={clsx('text-base', cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm font-semibold truncate', !n.is_read ? 'text-slate-100' : 'text-slate-300')}>
                      {n.subject}
                    </p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-slate-600 mt-1.5">{timeAgo(n.created_at)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  title="Delete"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
