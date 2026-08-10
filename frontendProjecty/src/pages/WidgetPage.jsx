import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import {
  AppWindow,
  Bell,
  CheckCircle2,
  Clock3,
  DoorOpen,
  FileText,
  FolderKanban,
  Heart,
  Lightbulb,
  ListTodo,
  Loader2,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  Square,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { Button } from '../components/ui/button';
import { CircularProgress } from '../components/shared/CircularProgress';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useActivityTracking } from '../context/ActivityTrackingContext';
import { useAuth } from '../hooks/useAuth';
import assistantCommandService from '../services/assistantCommandService';
import focusRoomService from '../services/focusRoomService';
import notificationService from '../services/notificationService';
import voiceService from '../services/voiceService';
import { formatTrackedTime } from '../services/activityTracking';

const sendAction = (action, extra) => {
  if (isTauri()) emit('widget-action', { action, ...extra });
};

const NOTIFICATION_ICONS = {
  TASK_REMINDER: ListTodo,
  AI_INSIGHT: Lightbulb,
  AI_MOTIVATION: Heart,
  FOCUS_ROOM_INVITE: Users,
  FRIEND_REQUEST_RECEIVED: UserPlus,
  FOCUS_ROOM_REPORT_READY: FileText,
  CIRCLE_INVITE: Users,
};

const formatAge = (createdAt) => {
  if (!createdAt) return 'now';
  try {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  } catch {
    return 'recently';
  }
};

const formatElapsed = (startedAt) => {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const formatFocusTime = (minutes = 0) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const speechChunks = (value) => {
  const clean = value
    .replace(/\[S\d+]/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const chunks = [];
  for (const sentence of sentences) {
    const next = sentence.trim();
    if (!next) continue;
    if (chunks.length && `${chunks[chunks.length - 1]} ${next}`.length <= 170) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${next}`;
    } else if (next.length <= 170) {
      chunks.push(next);
    } else {
      const words = next.split(' ');
      let chunk = '';
      words.forEach((word) => {
        if (`${chunk} ${word}`.trim().length > 170 && chunk) {
          chunks.push(chunk);
          chunk = word;
        } else {
          chunk = `${chunk} ${word}`.trim();
        }
      });
      if (chunk) chunks.push(chunk);
    }
  }
  return chunks.slice(0, 6);
};

const RecordingSurface = ({ state, elapsed, onStop }) => {
  const processing = state === 'transcribing';
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-3">
      <div className="flex h-20 items-center gap-1.5 rounded-full border border-white/10 bg-background/35 px-5 shadow-sm backdrop-blur-xl">
        {processing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          [8, 18, 30, 22, 38, 26, 14, 24, 10].map((height, index) => (
            <span
              key={index}
              className="w-1 rounded-full bg-primary animate-pulse"
              style={{ height: `${height}px`, animationDelay: `${index * 80}ms` }}
            />
          ))
        )}
        {!processing && (
          <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Mic className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-[15px] font-semibold text-foreground">{processing ? 'Thinking' : 'Listening'}</p>
        <p className="mt-1 font-numeric text-[11px] tabular-nums text-muted-foreground">
          {processing ? 'One moment...' : elapsed}
        </p>
      </div>

      {!processing && (
        <button
          type="button"
          onClick={onStop}
          className="flex h-10 items-center gap-2 rounded-full border border-border/70 bg-secondary/80 px-4 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          <Square className="h-3 w-3 fill-current" />
          Finish
        </button>
      )}
    </div>
  );
};

const DailyOverview = ({ firstName, topApp, focusMinutes, focusedAppSeconds }) => {
  const hasFocusOverlap = Boolean(topApp?.focusSeconds);
  const topAppTime = topApp
    ? formatTrackedTime(hasFocusOverlap ? topApp.focusSeconds : topApp.seconds)
    : '0m';
  const focusTime = formatFocusTime(focusMinutes);
  const insight = focusMinutes > 0 && hasFocusOverlap
    ? `${focusTime} of focused work today. ${topApp.name} carried most of the session.`
    : focusMinutes > 0 && topApp
      ? `${focusTime} of focused work today. ${topApp.name} led your desktop time.`
    : focusMinutes > 0
      ? `You have banked ${focusTime} of focused work today.`
      : topApp
        ? `${topApp.name} led your desktop time. One focused block would round out the day.`
        : 'Your day is open. One focused block is a good place to begin.';

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 py-0.5">
      <div>
        <p className="text-[22px] font-semibold leading-[1.2] text-foreground">
          {getGreeting()}, {firstName}.
        </p>
        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{insight}</p>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-[20px] border border-border/60 bg-background/30 shadow-sm backdrop-blur-xl">
        <div className="min-w-0 border-r border-border/60 p-2.5">
          <div className="mb-2 flex h-7 w-7 items-center justify-center overflow-hidden rounded-[9px] bg-secondary text-foreground">
            {topApp?.iconDataUrl
              ? <img src={topApp.iconDataUrl} alt="" className="h-full w-full object-cover" />
              : <AppWindow className="h-4 w-4" />}
          </div>
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">{hasFocusOverlap ? 'Focus app' : 'Most used'}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-foreground" title={topApp?.name || 'No activity yet'}>
            {topApp?.name || 'No activity yet'}
          </p>
          <p className="mt-0.5 font-numeric text-[10px] text-muted-foreground">{topAppTime} {hasFocusOverlap ? 'in sessions' : 'today'}</p>
        </div>

        <div className="min-w-0 p-2.5">
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
            <Clock3 className="h-4 w-4" />
          </div>
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Daily focus</p>
          <p className="mt-1 font-numeric text-[17px] font-semibold text-foreground">{focusTime}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {focusedAppSeconds > 0 ? `${formatTrackedTime(focusedAppSeconds)} app-verified` : 'banked today'}
          </p>
        </div>
      </div>
    </div>
  );
};

const NotificationRows = ({ notifications }) => {
  if (notifications.length === 0) {
    return <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground"><CheckCircle2 className="h-6 w-6 text-[hsl(var(--chart-4))]" /><p className="text-xs">You are all caught up.</p><p className="max-w-[190px] text-[10px] leading-relaxed">Ask Collab anything or start a focus session when you are ready.</p></div>;
  }

  return notifications.map((notification) => {
    const Icon = NOTIFICATION_ICONS[notification.type] || Sparkles;
    return <div key={notification.id} className={`flex items-start gap-2 rounded-xl px-2.5 py-2 ${notification.read ? 'bg-muted/35' : 'bg-primary/10'}`}><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background/60 text-primary"><Icon className="h-3 w-3" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-[11px] font-medium text-foreground">{notification.title}</p>{!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}</div><p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{notification.body}</p><p className="mt-1 text-[9px] text-muted-foreground/70">{formatAge(notification.createdAt)}</p></div></div>;
  });
};

const Composer = ({ value, onChange, onSubmit, onToggleVoice, voiceState }) => (
  <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-border/70 bg-background/45 p-1.5 shadow-sm">
    <MessageCircle className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Ask Collab..."
      aria-label="Ask Collab"
      className="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
    />
    {value.trim() && (
      <button type="submit" title="Send command" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">
        <Send className="h-3 w-3" />
      </button>
    )}
    <button
      type="button"
      onClick={onToggleVoice}
      disabled={voiceState === 'transcribing'}
      title={voiceState === 'recording' ? 'Finish voice command' : 'Speak to Collab'}
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
        voiceState === 'recording' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-foreground hover:bg-secondary/70'
      }`}
    >
      {voiceState === 'recording' && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />}
      {voiceState === 'transcribing' ? <Loader2 className="relative h-3.5 w-3.5 animate-spin" /> : voiceState === 'recording' ? <Square className="relative h-3 w-3 fill-current" /> : <Mic className="relative h-3.5 w-3.5" />}
    </button>
  </form>
);

export const WidgetPage = () => {
  const { user } = useAuth();
  const { summary: activitySummary, refresh: refreshActivity } = useActivityTracking();
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [assistantResult, setAssistantResult] = useState(null);
  const [command, setCommand] = useState('');
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState('00:00');
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [panel, setPanel] = useState('overview');
  const [conversation, setConversation] = useState([]);
  const [dailyFocusMinutes, setDailyFocusMinutes] = useState(0);
  const swipeStart = useRef(null);
  const sessionRef = useRef(null);
  const lastSpokenText = useRef('');
  const spokenAudioRef = useRef(null);

  const refreshDigest = useCallback(async () => {
    refreshActivity();
    const [listResult, countResult, entriesResult, roomsResult] = await Promise.allSettled([
      notificationService.getAllNotifications({ size: 5 }),
      notificationService.getUnreadCount(),
      focusRoomService.getTimeEntries(),
      focusRoomService.getAllRooms({ size: 100 }),
    ]);

    if (listResult.status === 'fulfilled') setNotifications(listResult.value.content || []);
    if (countResult.status === 'fulfilled') setUnreadCount(countResult.value || 0);

    const now = new Date();
    const bankedMinutes = entriesResult.status === 'fulfilled'
      ? (entriesResult.value || [])
        .filter((entry) => entry.earnedAt && isSameDay(new Date(entry.earnedAt), now))
        .reduce((total, entry) => total + (entry.minutesFocused || 0), 0)
      : 0;
    const completedRoomMinutes = roomsResult.status === 'fulfilled'
      ? (roomsResult.value.content || [])
        .filter((room) => room.status === 'COMPLETED' && room.updatedAt && isSameDay(new Date(room.updatedAt), now))
        .reduce((total, room) => {
          const participant = room.participants?.find((entry) => entry.email === user?.email);
          return total + (participant?.minutesFocused || 0);
        }, 0)
      : 0;
    setDailyFocusMinutes(bankedMinutes + completedRoomMinutes);
  }, [refreshActivity, user?.email]);

  const runAssistant = async (rawCommand) => {
    const trimmed = rawCommand.trim();
    if (!trimmed) return;
    setCommand('');
    const history = conversation.slice(-6);
    setConversation((previous) => [...previous, { role: 'user', text: trimmed }].slice(-8));
    setAssistantResult({ text: trimmed, kind: 'working' });
    try {
      const result = await assistantCommandService.execute(trimmed, history);
      setAssistantResult(result);
      setConversation((previous) => [...previous, { role: 'assistant', text: result.text, sources: result.sources || [] }].slice(-8));
      refreshDigest();
    } catch (error) {
      const errorText = error.response?.data?.message || 'I could not complete that command. Please try again.';
      setAssistantResult({
        text: errorText,
        kind: 'error',
      });
      setConversation((previous) => [...previous, { role: 'assistant', text: errorText, sources: [] }].slice(-8));
    }
  };

  const { state: voiceState, toggleRecording, stopRecording, startRecording } = useVoiceRecorder({
    onTranscribed: runAssistant,
    onError: () => setAssistantResult({ text: 'Microphone access or transcription failed. Please try again.', kind: 'error' }),
  });

  const beginVoice = useCallback(() => {
    if (voiceState !== 'idle') return;
    setAssistantResult(null);
    setRecordingStartedAt(Date.now());
    startRecording();
  }, [startRecording, voiceState]);

  const toggleVoice = () => {
    if (voiceState === 'idle') {
      beginVoice();
      return;
    } else if (voiceState === 'recording') {
      stopRecording();
    }
    toggleRecording();
  };

  const handleTouchStart = (event) => {
    const touch = event.changedTouches[0];
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event) => {
    if (!session || swipeStart.current == null) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStart.current.x;
    const deltaY = touch.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(deltaX) < 72 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;
    if (deltaX < 0) setPanel('notifications');
    if (deltaX > 0) setPanel('pomodoro');
  };

  const handleWheel = (event) => {
    if (!session || Math.abs(event.deltaX) < 40 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 2.5) return;
    if (event.deltaX < 0) setPanel('notifications');
    if (event.deltaX > 0) setPanel('pomodoro');
  };

  useEffect(() => {
    const initialRefresh = setTimeout(refreshDigest, 0);
    const interval = setInterval(refreshDigest, 60_000);
    return () => {
      clearTimeout(initialRefresh);
      clearInterval(interval);
    };
  }, [refreshDigest]);

  useEffect(() => {
    if (voiceState !== 'recording' || !recordingStartedAt) return undefined;
    const timer = setInterval(() => setElapsed(formatElapsed(recordingStartedAt)), 250);
    return () => clearInterval(timer);
  }, [voiceState, recordingStartedAt]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.ctrlKey && (event.altKey || event.shiftKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        beginVoice();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [beginVoice]);

  useEffect(() => {
    if (!assistantResult || assistantResult.kind === 'working' || !voiceReplies) return undefined;
    const text = assistantResult.text;
    if (!text || text === lastSpokenText.current) return undefined;
    lastSpokenText.current = text;
    let cancelled = false;
    let objectUrl = null;

    const playAudio = (audio) => new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });

    const systemFallback = () => {
      if (!window.speechSynthesis || cancelled) return;
      const utterance = new SpeechSynthesisUtterance(text.replace(/\[S\d+]/g, ''));
      const preferredVoice = window.speechSynthesis.getVoices().find((voice) => /Samantha|Karen|Daniel|Alex|Google US English/i.test(voice.name));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.01;
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    const speak = async () => {
      setSpeaking(true);
      try {
        for (const chunk of speechChunks(text)) {
          if (cancelled) return;
          const blob = await voiceService.synthesize(chunk);
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          const audio = new Audio(objectUrl);
          spokenAudioRef.current = audio;
          await playAudio(audio);
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        if (!cancelled) setSpeaking(false);
      } catch {
        if (!cancelled) systemFallback();
      }
    };

    window.speechSynthesis?.cancel();
    speak();
    return () => {
      cancelled = true;
      spokenAudioRef.current?.pause();
      spokenAudioRef.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    };
  }, [assistantResult, voiceReplies]);

  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevBody = body.style.background;
    const prevHtml = html.style.background;
    body.style.background = 'transparent';
    html.style.background = 'transparent';
    return () => {
      body.style.background = prevBody;
      html.style.background = prevHtml;
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return undefined;
    const unlistenUpdate = listen('session-update', (event) => {
      const wasInactive = sessionRef.current == null;
      sessionRef.current = event.payload;
      setSession(event.payload);
      if (wasInactive) setPanel('pomodoro');
    });
    const unlistenClear = listen('session-cleared', () => {
      sessionRef.current = null;
      setSession(null);
      setPanel('overview');
      refreshDigest();
    });
    return () => {
      unlistenUpdate.then((fn) => fn());
      unlistenClear.then((fn) => fn());
    };
  }, [refreshDigest]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    const unlisten = listen('assistant-hotkey', () => {
      beginVoice();
    });
    return () => unlisten.then((fn) => fn());
  }, [beginVoice]);

  const topApp = activitySummary.todayFocusApps?.[0] || activitySummary.todayTopApps?.[0] || null;
  const firstName = user?.firstName?.trim() || 'there';

  const header = (
    <div className="flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-[7px] bg-primary text-primary-foreground">
          <FolderKanban className="h-3 w-3" />
        </div>
        <span className="text-[11px] font-semibold text-foreground">Collab</span>
        </div>
      {session && (
        <div className="ml-2 flex flex-1 items-center gap-1" aria-label="Widget pages">
          <button type="button" title="Pomodoro" onClick={() => setPanel('pomodoro')} className={`h-1.5 rounded-full transition-all ${panel === 'pomodoro' ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
          <button type="button" title="Notifications" onClick={() => setPanel('notifications')} className={`h-1.5 rounded-full transition-all ${panel === 'notifications' ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
        </div>
      )}
      {session ? (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-4))]" />Live</div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="font-numeric text-[9px] text-muted-foreground">{format(new Date(), 'EEE d')}</span>
          <button type="button" title={panel === 'notifications' ? 'Back to today' : 'Notifications'} onClick={() => setPanel((current) => current === 'notifications' ? 'overview' : 'notifications')} className="relative flex h-7 w-7 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />}
          </button>
        </div>
      )}
    </div>
  );

  const assistantView = voiceState !== 'idle' ? (
    <RecordingSurface state={voiceState} elapsed={elapsed} onStop={stopRecording} />
  ) : assistantResult ? (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>{assistantResult.kind === 'working' ? 'Collab is working...' : 'Collab assistant'}</span>
        {assistantResult.kind !== 'working' && (
          <button type="button" title={voiceReplies ? 'Mute spoken replies' : 'Enable spoken replies'} onClick={() => setVoiceReplies((value) => !value)} className="ml-auto text-muted-foreground hover:text-foreground">
            {voiceReplies ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className="min-h-0 max-h-44 space-y-2 overflow-y-auto rounded-2xl bg-muted/60 px-3 py-3 text-xs leading-relaxed text-foreground/85">
        {conversation.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-4 rounded-xl bg-primary/10 px-2.5 py-2 text-foreground' : 'mr-2 rounded-xl bg-background/45 px-2.5 py-2 text-foreground/85'}>
            <p className="whitespace-pre-line">{message.text}</p>
            {message.role === 'assistant' && message.sources?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 border-t border-border/50 pt-2" aria-label="Answer sources">
                {message.sources.slice(0, 4).map((source) => (
                  <span key={source.id} title={source.excerpt} className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-1.5 py-1 text-[9px] font-medium text-primary">
                    <FileText className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{source.type?.toLowerCase()} · {source.title}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {speaking && <span className="mt-2 flex items-center gap-1.5 text-[10px] text-primary"><Volume2 className="h-3 w-3 animate-pulse" />Speaking</span>}
      </div>
      <button type="button" onClick={() => setAssistantResult(null)} className="text-center text-[10px] font-medium text-muted-foreground hover:text-foreground">Back to today</button>
    </div>
  ) : null;

  return (
    <div className="h-screen w-screen bg-transparent">
      <div className="flex h-full w-full flex-col gap-3 rounded-[28px] border border-border/50 bg-card/75 p-4 shadow-ios-lg ring-1 ring-black/5 backdrop-blur-2xl dark:ring-white/5" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel} style={{ touchAction: 'pan-y' }}>
        {header}

        {assistantView || (panel === 'notifications' ? (
          <>
            <div className="animate-in fade-in slide-in-from-left-2 flex shrink-0 items-end justify-between duration-200"><div><p className="text-sm font-semibold text-foreground">Recent activity</p><p className="mt-0.5 text-[10px] text-muted-foreground">{session ? 'Swipe right for your Pomodoro' : 'Your latest signals from Collab'}</p></div><Bell className="mb-1 h-4 w-4 text-muted-foreground" /></div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5"><NotificationRows notifications={notifications} /></div>
          </>
        ) : session ? (
          <>
            <div className="shrink-0 text-center">
              <p className="text-xs font-semibold text-foreground/90">{session.phaseLabel}</p>
              {session.roomCode && <p className="mt-0.5 font-numeric text-[10px] text-muted-foreground">{session.roomCode}</p>}
            </div>
            <div className="flex flex-1 items-center justify-center py-1">
              <CircularProgress percentage={session.percentage} size={124} strokeWidth={9} color="orange">
                <div className="flex flex-col items-center">
                  <p className="font-numeric text-2xl font-bold tabular-nums text-foreground">{session.remainingLabel}</p>
                  <p className="text-[10px] text-muted-foreground">remaining</p>
                </div>
              </CircularProgress>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm" className="h-11 flex-1 rounded-full" onClick={() => sendAction('leave')}><DoorOpen className="h-3.5 w-3.5" />Leave</Button>
              {session.isHost && <Button variant="destructive" size="sm" className="h-11 flex-1 rounded-full bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20" onClick={() => sendAction('end')}><Square className="h-3.5 w-3.5" />End</Button>}
            </div>
          </>
        ) : (
          <DailyOverview
            firstName={firstName}
            topApp={topApp}
            focusMinutes={dailyFocusMinutes}
            focusedAppSeconds={activitySummary.focusedAppSeconds || 0}
          />
        ))}

        {(!session || panel === 'notifications' || assistantResult) && voiceState === 'idle' && <Composer value={command} onChange={setCommand} onSubmit={(event) => { event.preventDefault(); runAssistant(command); }} onToggleVoice={toggleVoice} voiceState={voiceState} />}
      </div>
    </div>
  );
};

export default WidgetPage;
