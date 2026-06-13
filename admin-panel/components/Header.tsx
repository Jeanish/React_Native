'use client';
import { Bell, Check, Store } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const user = (() => {
    try {
      return JSON.parse(Cookies.get('admin_user') || '{}');
    } catch { return {}; }
  })();

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleNoteClick = (note: typeof notifications[0]) => {
    markRead(note.id);
    setOpen(false);
    if (note.type === 'salon:registered') {
      router.push('/dashboard/salons?filter=pending');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No notifications yet</p>
                ) : (
                  notifications.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleNoteClick(note)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!note.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!note.read ? 'bg-primary/10' : 'bg-slate-100'}`}>
                          <Store className={`w-4 h-4 ${!note.read ? 'text-primary' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{note.payload.salon.name}</p>
                          <p className="text-xs text-slate-500">{note.payload.salon.address.city} • Needs approval</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        {!note.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100">
                  <button
                    onClick={() => { setOpen(false); router.push('/dashboard/salons?filter=pending'); }}
                    className="text-xs text-primary hover:underline w-full text-center"
                  >
                    View all pending salons →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
            {user.firstName?.[0] || 'A'}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.firstName || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
