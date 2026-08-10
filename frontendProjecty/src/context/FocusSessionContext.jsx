/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { Window, getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from '../hooks/useAuth';
import { useFocusRoomSocketWithSignals } from '../hooks/useFocusRoomSocketWithSignals';
import { useActivityTracking } from './ActivityTrackingContext';

const FocusSessionContext = createContext(null);

const PHASE_LABEL = {
  WORK: 'Focus',
  BREAK: 'Break',
  LONG_BREAK: 'Long Break',
};

const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatLatestMessage = (message) => {
  if (!message) return null;
  if (message.type === 'SYSTEM') return message.body;
  if (message.type === 'AI') return `Collab: ${message.body}`;
  return `${message.senderName}: ${message.body}`;
};

// A Focus Room session used to live and die with FocusRoomPage — leaving the
// route tore the socket down, which stopped the countdown and (via the old
// unmount handler) told the tray/widget the session was over even though it
// was still running on the server. This provider owns the connection instead,
// so the session — and the tray/widget's view of it — survives navigating to
// any other page and only clears when the user actually leaves or ends it.
export const FocusSessionProvider = ({ children }) => {
  const { user } = useAuth();
  const { enabled: desktopTrackingEnabled, currentApp, setFocusContext } = useActivityTracking();
  const navigate = useNavigate();
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const socket = useFocusRoomSocketWithSignals(activeRoomCode);
  const { room } = socket;

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const [remaining, setRemaining] = useState(0);
  const [shareFocusSignal, setShareFocusSignal] = useState(false);
  const lastFocusSignalRef = useRef(undefined);

  const totalMs = useMemo(() => {
    if (!room) return 0;
    const minutes =
      { WORK: room.workMinutes, BREAK: room.breakMinutes, LONG_BREAK: room.longBreakMinutes }[room.currentPhase] ||
      room.workMinutes;
    return minutes * 60 * 1000;
  }, [room?.currentPhase, room?.workMinutes, room?.breakMinutes, room?.longBreakMinutes]);

  const ringPercentage = totalMs > 0 ? Math.max(0, Math.min(100, Math.round((remaining / totalMs) * 100))) : 0;
  const isHost = Boolean(room?.participants.find((p) => p.email === user?.email)?.host);

  // The one countdown tick for this session — runs regardless of which page
  // is on screen, so both LiveSession's UI and the tray/widget mirror the
  // exact same clock instead of each keeping their own.
  useEffect(() => {
    if (!room || room.status !== 'ACTIVE' || !room.phaseEndsAt) {
      setRemaining(0);
      return undefined;
    }
    const tick = () => {
      const ms = new Date(room.phaseEndsAt).getTime() - Date.now();
      setRemaining(ms);

      if (isTauri()) {
        const r = roomRef.current;
        const lastMessage = r.recentMessages?.[r.recentMessages.length - 1];
        emit('session-update', {
          remainingLabel: formatRemaining(ms),
          phaseLabel: `${PHASE_LABEL[r.currentPhase] || r.currentPhase} · Round ${r.currentRound}/${r.totalRounds}`,
          percentage: totalMs > 0 ? Math.max(0, Math.min(100, Math.round((ms / totalMs) * 100))) : 0,
          latestMessage: formatLatestMessage(lastMessage),
          isHost,
          roomCode: r.code,
        });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.phaseEndsAt, totalMs, isHost]);

  // Clears the tray/widget the moment there's genuinely nothing active to
  // show — reacts to the session's real state instead of a component
  // unmounting, which is what incorrectly fired this on every page change.
  const wasActiveRef = useRef(false);
  useEffect(() => {
    const isActiveNow = Boolean(room && room.status === 'ACTIVE');
    if (wasActiveRef.current && !isActiveNow && isTauri()) {
      emit('session-cleared');
    }
    wasActiveRef.current = isActiveNow;
  }, [room?.status]);

  useEffect(() => {
    const canShare = Boolean(room?.status === 'ACTIVE' && room?.currentPhase === 'WORK' && shareFocusSignal && desktopTrackingEnabled);
    const nextSignal = canShare ? (currentApp?.category || 'Focusing') : null;
    if (lastFocusSignalRef.current === nextSignal) return;
    lastFocusSignalRef.current = nextSignal;
    if (activeRoomCode) socket.sendFocusSignal(nextSignal);
  }, [activeRoomCode, currentApp?.category, desktopTrackingEnabled, room?.currentPhase, room?.status, shareFocusSignal, socket.sendFocusSignal]);

  useEffect(() => {
    if (!desktopTrackingEnabled) setShareFocusSignal(false);
  }, [desktopTrackingEnabled]);

  useEffect(() => {
    const active = Boolean(
      desktopTrackingEnabled
      && room?.status === 'ACTIVE'
      && room?.currentPhase === 'WORK'
    );
    setFocusContext(active ? { active: true, roomCode: room.code } : null);
    return () => setFocusContext(null);
  }, [desktopTrackingEnabled, room?.code, room?.currentPhase, room?.status, setFocusContext]);

  const joinSession = useCallback((code) => {
    setActiveRoomCode((prev) => (prev === code ? prev : code));
  }, []);

  // Disconnects only if there's nothing left worth staying connected for —
  // called when navigating away from a room whose session has already ended.
  // If we don't yet know the room's state (still null — the very first
  // snapshot hasn't landed), that's "unknown", not "done", so this must NOT
  // disconnect; treating it as done here was dropping an active session the
  // moment the user navigated away before the first broadcast arrived.
  const disconnectIfDone = useCallback((code) => {
    setActiveRoomCode((prev) => {
      if (prev !== code) return prev;
      const current = roomRef.current;
      if (!current) return prev;
      return current.status !== 'COMPLETED' ? prev : null;
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.sendLeave();
    // Give the STOMP frame a moment to actually flush before the socket tears
    // down underneath it.
    setTimeout(() => setActiveRoomCode(null), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.sendLeave]);

  const endRoomSession = useCallback(() => {
    socket.sendEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.sendEnd]);

  // Widget popover actions land here — not tied to any page being mounted —
  // so Leave/End/voice-send and clicking the latest message all work no
  // matter what's currently showing in the main window.
  useEffect(() => {
    // This same provider mounts in the widget window too (it shares the app
    // bundle) — only the main window's copy should ever act on these, or the
    // widget would receive and react to its own emitted events, including
    // navigating its own tiny window to a full-size page.
    if (!isTauri() || getCurrentWindow().label !== 'main') return undefined;
    const unlisten = listen('widget-action', async (event) => {
      const { action, text, route } = event.payload || {};
      if (action === 'leave') leaveRoom();
      if (action === 'end') endRoomSession();
      // forceAi: the widget's mic is a dedicated "ask Collab" input, not a
      // shared group chat — a message sent from it should always get a
      // reply, regardless of wording or how Whisper transcribed the name.
      if (action === 'send-message' && text) socket.sendChat(text, true);
      if (action === 'open-chat' && roomRef.current) {
        const mainWindow = await Window.getByLabel('main');
        await mainWindow?.show();
        await mainWindow?.setFocus();
        navigate(`/focus-rooms/${roomRef.current.code}`);
      }
      if (action === 'open-route' && route?.startsWith('/')) {
        const mainWindow = await Window.getByLabel('main');
        await mainWindow?.show();
        await mainWindow?.unminimize();
        await mainWindow?.setFocus();
        navigate(route);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    activeRoomCode,
    room,
    setRoom: socket.setRoom,
    remaining,
    ringPercentage,
    totalMs,
    isHost,
    connected: socket.connected,
    error: socket.error,
    clearError: socket.clearError,
    sendStart: socket.sendStart,
    sendHand: socket.sendHand,
    sendChat: socket.sendChat,
    sendChatMode: socket.sendChatMode,
    shareFocusSignal,
    setShareFocusSignal,
    desktopTrackingEnabled,
    leaveRoom,
    endRoomSession,
    joinSession,
    disconnectIfDone,
  };

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
};

export const useFocusSession = () => {
  const context = useContext(FocusSessionContext);
  if (!context) {
    throw new Error('useFocusSession must be used within a FocusSessionProvider');
  }
  return context;
};

export default FocusSessionContext;
