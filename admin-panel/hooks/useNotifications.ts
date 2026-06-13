'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSocket, connectSocket, type SalonRegisteredPayload } from '@/lib/socket';

export type Notification = {
  id: string;
  type: string;
  message: string;
  payload: SalonRegisteredPayload;
  read: boolean;
  timestamp: Date;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const handler = (payload: SalonRegisteredPayload) => {
      const note: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        type: payload.type,
        message: payload.message,
        payload,
        read: false,
        timestamp: new Date(),
      };
      setNotifications((prev) => [note, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);

      // Browser notification if tab is not focused
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('TrimCity Admin', { body: payload.message, icon: '/logo.png' });
      }
    };

    socket.on('salon:registered', handler);
    return () => { socket.off('salon:registered', handler); };
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return { notifications, unreadCount, markAllRead, markRead };
}
