import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { API_ORIGIN } from '../services/api';

const WS_URL = `${API_ORIGIN.replace(/^http/, 'ws')}/ws`;

// Server-authoritative Focus Room state over STOMP: the server owns phase
// transitions and pushes the full room snapshot on every change, so this
// hook just holds the latest snapshot plus a few "send an action" helpers.
export const useFocusRoomSocket = (code) => {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef(null);

  useEffect(() => {
    if (!code) return undefined;

    const token = localStorage.getItem('token');
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/rooms/${code}`, (message) => {
          setRoom(JSON.parse(message.body));
        });
        client.subscribe('/user/queue/errors', (message) => {
          setError(message.body);
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        setError(frame.headers?.message || 'Connection error');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [code]);

  const send = useCallback((action, body) => {
    const client = clientRef.current;
    if (!client || !client.connected) return;
    client.publish({
      destination: `/app/rooms/${code}/${action}`,
      body: body !== undefined ? JSON.stringify(body) : '',
    });
  }, [code]);

  const sendStart = useCallback(() => send('start'), [send]);
  const sendEnd = useCallback(() => send('end'), [send]);
  const sendLeave = useCallback(() => send('leave'), [send]);
  const sendHand = useCallback(() => send('hand'), [send]);
  const sendChat = useCallback((body, forceAi = false) => send('chat', { body, forceAi }), [send]);
  const sendChatMode = useCallback((mode) => send('chat-mode', { mode }), [send]);
  const clearError = useCallback(() => setError(''), []);

  return { room, setRoom, connected, error, clearError, sendStart, sendEnd, sendLeave, sendHand, sendChat, sendChatMode };
};

export default useFocusRoomSocket;
