import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { isTauri } from '@tauri-apps/api/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import notificationService from '../services/notificationService';
import { API_ORIGIN } from '../services/api';

const WS_URL = `${API_ORIGIN.replace(/^http/, 'ws')}/ws`;

const notifyDesktop = async (notification) => {
  if (!isTauri()) return;
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === 'granted';
  if (!granted) return;
  sendNotification({
    title: notification.title,
    body: notification.body,
    extra: { link: notification.link },
  });
};

// A second, independent STOMP connection alongside useFocusRoomSocket's
// per-room one — this one is opened once for the whole authenticated
// session so notifications arrive in real time on any page.
export const useNotificationSocket = (enabled) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const clientRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        notificationService.getAllNotifications({ size: 20 }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list.content || []);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    refresh();

    const token = localStorage.getItem('token');
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (message) => {
          const notification = JSON.parse(message.body);
          setNotifications((prev) => [notification, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
          notifyDesktop(notification);
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, refresh };
};

export default useNotificationSocket;
