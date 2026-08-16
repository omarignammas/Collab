import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  AppWindow,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  NotebookPen,
  Pause,
  Play,
  Plus,
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
import courseSummaryService from '../services/courseSummaryService';
import focusRoomService from '../services/focusRoomService';
import noteService from '../services/noteService';
import notificationService from '../services/notificationService';
import taskService from '../services/taskService';
import voiceService from '../services/voiceService';
import { formatTrackedTime } from '../services/activityTracking';
import { TASK_STATUS, getTaskStatus } from '../lib/taskStatus';

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

const WORK_NUDGES = [
  'Stay with the one thing.',
  'Good work. Protect this block.',
  'Small progress still compounds.',
  'One clear finish beats five open loops.',
];

const BREAK_NUDGES = [
  'Good work. Time for a real break?',
  'Step away for a moment. Your focus will thank you.',
  'Reset your eyes, shoulders, and attention.',
];

const WIDGET_TABS = [
  { key: 'today', label: 'Today', icon: Clock3 },
  { key: 'tasks', label: 'Tasks', icon: FolderKanban },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
];

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
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#dc7954]/10 text-[#dc7954]">
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
  <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-border/50 bg-background/35 p-1.5">
    <MessageCircle className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Ask Collab..."
      aria-label="Ask Collab"
      className="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60"
    />
    {value.trim() && (
      <button type="submit" title="Send command" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dc7954] text-white transition-transform hover:scale-105">
        <Send className="h-3 w-3" />
      </button>
    )}
    <button
      type="button"
      onClick={onToggleVoice}
      disabled={voiceState === 'transcribing'}
      title={voiceState === 'recording' ? 'Finish voice command' : 'Speak to Collab'}
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
        voiceState === 'recording' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary/60 text-foreground hover:bg-secondary/80'
      }`}
    >
      {voiceState === 'recording' && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />}
      {voiceState === 'transcribing' ? <Loader2 className="relative h-3.5 w-3.5 animate-spin" /> : voiceState === 'recording' ? <Square className="relative h-3 w-3 fill-current" /> : <Mic className="relative h-3.5 w-3.5" />}
    </button>
  </form>
);

const QuickNoteSurface = ({ value, onChange, onSave, onCancel, onToggleVoice, voiceState, saving, recentNotes }) => (
  <form onSubmit={onSave} className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] font-semibold text-foreground">Quick note</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Write naturally. Collab will format and organize it.</p>
      </div>
      {value.trim() && <button type="button" onClick={onCancel} className="text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground">Clear</button>}
    </div>

    <div className="relative min-h-0 flex-1">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Capture a thought, decision, link, or reminder..."
        aria-label="Quick note"
        className="h-full min-h-32 w-full resize-none rounded-2xl border border-border/70 bg-background/45 p-3 pr-11 text-[12px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/45"
        autoFocus
      />
      <button
        type="button"
        onClick={onToggleVoice}
        disabled={voiceState === 'transcribing' || saving}
        title={voiceState === 'recording' ? 'Finish voice note' : 'Add to note by voice'}
        className={`absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${voiceState === 'recording' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-foreground hover:bg-secondary/70'}`}
      >
        {voiceState === 'transcribing' ? <Loader2 className="h-4 w-4 animate-spin" /> : voiceState === 'recording' ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
      </button>
    </div>

    <Button type="submit" size="sm" className="h-10 w-full rounded-full shrink-0 bg-[#dc7954] text-white hover:bg-[#e18a60]" disabled={!value.trim() || saving || voiceState !== 'idle'}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {saving ? 'Saving...' : 'Save and organize'}
    </Button>

    {!value.trim() && recentNotes?.length > 0 && (
      <div className="shrink-0 border-t border-border/50 pt-2.5">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
        <div className="space-y-1">
          {recentNotes.map((note) => (
            <button
              type="button"
              key={note.id}
              onClick={() => sendAction('open-route', { route: '/notes' })}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-muted/50"
            >
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate text-[10.5px] text-foreground/85">{note.title}</span>
            </button>
          ))}
        </div>
      </div>
    )}
  </form>
);

const TASK_FILTER_ALL = 'ALL';
const TASK_FILTER_UNSORTED = 'UNSORTED';

const TasksTab = ({ tasks, loaded, filter, onFilterChange, onComplete, draft, onDraftChange, onAdd, adding }) => {
  const openTasks = tasks.filter((t) => getTaskStatus(t) !== TASK_STATUS.DONE);
  const projects = Array.from(new Set(openTasks.map((t) => t.courseTitle).filter(Boolean)));
  const hasUnsorted = openTasks.some((t) => !t.courseTitle);
  const filtered = openTasks.filter((t) => {
    if (filter === TASK_FILTER_ALL) return true;
    if (filter === TASK_FILTER_UNSORTED) return !t.courseTitle;
    return t.courseTitle === filter;
  });

  const filterClass = (active) => `relative shrink-0 truncate pb-1.5 text-[11px] font-medium transition-colors ${active ? 'text-[#dc7954]' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(projects.length > 0 || hasUnsorted) && (
        <div className="thin-scrollbar flex shrink-0 gap-4 overflow-x-auto border-b border-border/40 px-0.5">
          <button type="button" onClick={() => onFilterChange(TASK_FILTER_ALL)} className={filterClass(filter === TASK_FILTER_ALL)}>
            All
            {filter === TASK_FILTER_ALL && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#dc7954]" />}
          </button>
          {hasUnsorted && (
            <button type="button" onClick={() => onFilterChange(TASK_FILTER_UNSORTED)} className={filterClass(filter === TASK_FILTER_UNSORTED)}>
              Unsorted
              {filter === TASK_FILTER_UNSORTED && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#dc7954]" />}
            </button>
          )}
          {projects.map((project) => (
            <button type="button" key={project} title={project} onClick={() => onFilterChange(project)} className={`max-w-[100px] ${filterClass(filter === project)}`}>
              {project}
              {filter === project && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#dc7954]" />}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pt-1">
        {!loaded ? (
          <div className="space-y-1">{[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/30" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-[hsl(var(--chart-4))]" />
            <p className="text-xs">Nothing here. Add one below.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((task) => (
              <div key={task.id} className="group flex items-center gap-3 px-0.5 py-2.5 transition-colors">
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  title="Mark complete"
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/35 transition-colors group-hover:border-[#dc7954]"
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/90">{task.title}</span>
                <span className="shrink-0 text-[11px] font-medium text-[#dc7954]/80">+10 XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={() => document.getElementById('widget-task-input')?.focus()} className="flex shrink-0 items-center gap-2 px-0.5 py-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
      <form onSubmit={onAdd} className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-border/50 bg-background/35 p-1.5">
        <input
          id="widget-task-input"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="What needs to be done?"
          aria-label="Add a task"
          className="min-w-0 flex-1 bg-transparent px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {draft.trim() && (
          <button type="submit" disabled={adding} title="Add task" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dc7954] text-white transition-transform hover:scale-105 disabled:opacity-60">
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        )}
      </form>
    </div>
  );
};

const ChatTab = ({ session, messages, currentUserEmail, draft, onDraftChange, onSend }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center text-muted-foreground">
        <MessageCircle className="h-6 w-6" />
        <p className="text-xs font-medium text-foreground/80">No active Focus Room</p>
        <p className="max-w-[210px] text-[10.5px] leading-relaxed">Chat lives inside Focus Rooms — start or join one to talk with your group. Collab jumps in when it is useful.</p>
        <button
          type="button"
          onClick={() => sendAction('open-route', { route: '/focus-rooms' })}
          className="mt-1 rounded-full bg-[#dc7954] px-3.5 py-1.5 text-[11px] font-semibold text-white transition-transform hover:scale-105 hover:bg-[#e18a60]"
        >
          Open Focus Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {messages.length === 0 ? (
          <p className="pt-6 text-center text-[10.5px] text-muted-foreground">Say hello to the room.</p>
        ) : (
          messages.map((message) => {
            if (message.type === 'SYSTEM') {
              return <p key={message.id} className="text-center text-[9.5px] text-muted-foreground/80">{message.body}</p>;
            }
            if (message.type === 'AI') {
              return (
                <div key={message.id} className="rounded-xl bg-primary/10 px-2.5 py-2">
                  <div className="mb-0.5 flex items-center gap-1 text-[9.5px] font-semibold text-primary"><Sparkles className="h-2.5 w-2.5" />Collab</div>
                  <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-foreground/90">{message.body}</p>
                </div>
              );
            }
            const isMine = message.senderEmail === currentUserEmail;
            return (
              <div key={message.id} className="px-1">
                <span className="text-[10px] font-semibold text-foreground/85">{isMine ? 'You' : message.senderName}</span>
                <span className="ml-1.5 text-[11.5px] text-foreground/80">{message.body}</span>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={onSend} className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-border/50 bg-background/35 p-1.5">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Message the room..."
          aria-label="Message the room"
          className="min-w-0 flex-1 bg-transparent px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {draft.trim() && (
          <button type="submit" title="Send" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dc7954] text-white transition-transform hover:scale-105">
            <Send className="h-3 w-3" />
          </button>
        )}
      </form>
    </div>
  );
};

const CompactFocusWidget = ({
  session,
  nudgesEnabled,
  nudgeIndex,
  nudgeVisible,
  onDismissNudge,
  onTogglePause,
  onExpand,
}) => {
  const reduceMotion = useReducedMotion();
  const isBreak = /break/i.test(session.phaseLabel || '');
  const messages = isBreak ? BREAK_NUDGES : WORK_NUDGES;
  const message = messages[nudgeIndex % messages.length];

  return (
    <div className="flex h-screen w-screen flex-col items-center overflow-hidden bg-transparent">
      <Motion.div
        initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="flex h-[50px] shrink-0 items-center gap-1 rounded-[25px] border border-white/10 bg-[#242428]/95 p-1 text-white shadow-[0_12px_30px_rgba(0,0,0,0.3)] ring-1 ring-black/35 backdrop-blur-2xl"
      >
        <div className="flex h-[42px] min-w-[178px] items-center justify-center gap-2.5 rounded-[21px] border border-white/10 bg-[#19191d]/90 px-3.5 shadow-inner">
          <span className={`flex h-5 w-5 items-center justify-center rounded-[7px] ${isBreak ? 'bg-[#77b7ff]' : 'bg-[#dc7954]'} text-white`}>
            <FolderKanban className="h-3 w-3" strokeWidth={2.4} />
          </span>
          <span className="font-numeric text-[19px] font-medium tabular-nums tracking-normal text-white">
            {session.remainingLabel}
          </span>
        </div>

        <button
          type="button"
          title={!session.isHost ? 'Only the host can pause' : session.paused ? 'Resume session' : 'Pause session'}
          onClick={onTogglePause}
          disabled={!session.isHost}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/20 text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {session.paused ? <Play className="h-[17px] w-[17px] fill-current" /> : <Pause className="h-[17px] w-[17px] fill-current" />}
        </button>

        <button
          type="button"
          title="Open Focus Room controls"
          onClick={onExpand}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/20 text-white transition-colors hover:bg-white/25"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </Motion.div>

      <AnimatePresence>
        {nudgeVisible && nudgesEnabled && (
          <Motion.div
            key={`${session.phaseLabel}-${nudgeIndex}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="mt-2 flex h-[46px] w-[394px] items-center gap-2 rounded-[23px] border border-white/8 bg-[#2a2a2e]/95 px-2.5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.26)] ring-1 ring-black/25 backdrop-blur-2xl"
          >
            <span className="shrink-0 rounded-full bg-[#dc7954]/15 px-2 py-0.5 text-[11px] font-bold text-[#dc7954]">+200 XP</span>
            <p className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-normal text-white/90">{message}</p>
            <button
              type="button"
              onClick={onDismissNudge}
              className="h-[30px] shrink-0 rounded-full bg-[#dc7954] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#e18a60]"
            >
              Accept
            </button>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [panel, setPanel] = useState('today');
  const [conversation, setConversation] = useState([]);
  const [dailyFocusMinutes, setDailyFocusMinutes] = useState(0);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [recentNotes, setRecentNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [taskDraft, setTaskDraft] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [compactFocus, setCompactFocus] = useState(true);
  const nudgesEnabled = true;
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const sessionRef = useRef(null);
  const panelRef = useRef('today');
  const lastSpokenText = useRef('');
  const spokenAudioRef = useRef(null);
  const researchPollToken = useRef(0);
  const discardTranscriptionRef = useRef(false);

  // goToPanel keeps panelRef synchronously correct — handleTranscribed below
  // reads it from inside a callback that useVoiceRecorder may have captured
  // on an earlier render, so a plain `panel` closure read risks being stale.
  const goToPanel = useCallback((next) => {
    panelRef.current = next;
    setPanel(next);
  }, []);

  const setWidgetDisplayMode = useCallback((mode) => {
    if (isTauri()) emit('widget-display-mode', { mode });
  }, []);

  const expandFocusWidget = useCallback(() => {
    setCompactFocus(false);
    setNudgeVisible(false);
    goToPanel('today');
    setWidgetDisplayMode('expanded');
  }, [goToPanel, setWidgetDisplayMode]);

  const collapseFocusWidget = useCallback(() => {
    setCompactFocus(true);
    setAssistantResult(null);
    goToPanel('today');
    setWidgetDisplayMode('compact');
  }, [goToPanel, setWidgetDisplayMode]);

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

  const watchResearchReport = useCallback(async (createdSummary) => {
    const token = researchPollToken.current + 1;
    researchPollToken.current = token;
    for (let attempt = 0; attempt < 48; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (researchPollToken.current !== token) return;
      try {
        const report = await courseSummaryService.getSummaryById(createdSummary.id);
        if (report.status === 'READY') {
          const readyText = `Your report “${report.title}” is ready. I’m opening it in Summaries now.`;
          const source = { id: `summary-${report.id}`, type: 'REPORT', title: report.title, route: `/summaries/${report.id}`, excerpt: 'Completed research report' };
          setAssistantResult({ text: readyText, kind: 'research-ready', sources: [source] });
          setConversation((previous) => [...previous, { role: 'assistant', text: readyText, sources: [source] }].slice(-8));
          sendAction('open-route', { route: `/summaries/${report.id}` });
          refreshDigest();
          return;
        }
        if (report.status === 'FAILED' || report.status === 'CANCELLED') {
          setAssistantResult({ text: `I could not finish “${report.title}”. Open Summaries to retry it.`, kind: 'error', sources: [] });
          return;
        }
      } catch {
        // Keep polling through brief network interruptions.
      }
    }
    setAssistantResult({ text: `Your report is still processing. You can follow it in Summaries.`, kind: 'research', sources: [{ id: `summary-${createdSummary.id}`, type: 'REPORT', title: createdSummary.title, route: `/summaries/${createdSummary.id}`, excerpt: 'Research still processing' }] });
  }, [refreshDigest]);

  useEffect(() => () => {
    researchPollToken.current += 1;
  }, []);

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
      if (result.autoOpenWhenReady && result.summary?.id) watchResearchReport(result.summary);
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

  const handleTranscribed = (text) => {
    if (discardTranscriptionRef.current) {
      discardTranscriptionRef.current = false;
      return;
    }
    if (panelRef.current === 'notes') {
      setQuickNoteText((current) => (current ? `${current} ${text}` : text));
      return;
    }
    runAssistant(text);
  };

  const { state: voiceState, toggleRecording, stopRecording, startRecording } = useVoiceRecorder({
    onTranscribed: handleTranscribed,
    onError: () => {
      discardTranscriptionRef.current = false;
      setAssistantResult({ text: 'Microphone access or transcription failed. Please try again.', kind: 'error' });
    },
  });

  const beginVoice = useCallback(() => {
    if (voiceState !== 'idle') return;
    if (sessionRef.current) expandFocusWidget();
    setAssistantResult(null);
    setRecordingStartedAt(Date.now());
    startRecording();
  }, [expandFocusWidget, startRecording, voiceState]);

  const toggleVoice = () => {
    if (voiceState === 'idle') {
      beginVoice();
      return;
    } else if (voiceState === 'recording') {
      stopRecording();
    }
    toggleRecording();
  };

  const beginQuickNote = useCallback(() => {
    if (voiceState === 'recording') {
      discardTranscriptionRef.current = true;
      stopRecording();
    }
    setAssistantResult(null);
    if (sessionRef.current) expandFocusWidget();
    goToPanel('notes');
  }, [expandFocusWidget, goToPanel, stopRecording, voiceState]);

  const clearNoteDraft = () => {
    if (voiceState === 'recording' || voiceState === 'transcribing') discardTranscriptionRef.current = true;
    if (voiceState === 'recording') stopRecording();
    setQuickNoteText('');
  };

  const saveQuickNote = async (event) => {
    event.preventDefault();
    const body = quickNoteText.trim();
    if (!body) return;
    setSavingNote(true);
    try {
      const words = body.replace(/\s+/g, ' ').split(' ');
      const title = `${words.slice(0, 7).join(' ')}${words.length > 7 ? '…' : ''}`;
      const note = await noteService.createNote({ title, body, tags: [], savedUrl: null, courseId: null, taskId: null, roomCode: null });
      setQuickNoteText('');
      setRecentNotes((previous) => [note, ...previous].slice(0, 3));
    } catch (error) {
      setAssistantResult({ text: error.response?.data?.message || 'I could not save that note. Please try again.', kind: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      const result = await taskService.getAllTasks({ size: 100, sortField: 'dueDate', direction: 'ASC' });
      setTasks(result.content || []);
    } catch {
      // Leave the previous list on screen rather than clearing it on a blip.
    } finally {
      setTasksLoaded(true);
    }
  }, []);

  const fetchRecentNotes = useCallback(async () => {
    try {
      const result = await noteService.getAllNotes({ size: 3, sortField: 'createdAt', direction: 'DESC' });
      setRecentNotes(result.content || []);
    } catch {
      // Quiet failure — the composer above still works either way.
    }
  }, []);

  const completeTask = async (taskId) => {
    setTasks((previous) => previous.filter((t) => t.id !== taskId));
    try {
      await taskService.markTaskCompleted(taskId);
    } catch {
      fetchTasks();
    }
  };

  const addTask = async (event) => {
    event.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    setAddingTask(true);
    try {
      const created = await taskService.createTask({ title });
      setTasks((previous) => [created, ...previous]);
      setTaskDraft('');
    } catch {
      // Leave the draft in place so the attempt isn't silently lost.
    } finally {
      setAddingTask(false);
    }
  };

  const sendChatMessage = (event) => {
    event.preventDefault();
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft('');
    sendAction('chat-send', { text });
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
    if (!session?.roomCode || !compactFocus || !nudgesEnabled) {
      setNudgeVisible(false);
      return undefined;
    }

    let hideTimer;
    const showNudge = () => {
      setNudgeIndex((current) => current + 1);
      setNudgeVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setNudgeVisible(false), 9_000);
    };

    const introTimer = setTimeout(showNudge, 1_400);
    const repeatTimer = setInterval(showNudge, 8 * 60_000);
    return () => {
      clearTimeout(introTimer);
      clearTimeout(hideTimer);
      clearInterval(repeatTimer);
    };
  }, [compactFocus, nudgesEnabled, session?.phaseLabel, session?.roomCode]);

  useEffect(() => {
    if (!session || !compactFocus || panel === 'notes' || voiceState !== 'idle' || assistantResult) return;
    setWidgetDisplayMode(nudgeVisible && nudgesEnabled ? 'nudge' : 'compact');
  }, [assistantResult, compactFocus, nudgeVisible, nudgesEnabled, panel, session?.roomCode, setWidgetDisplayMode, voiceState]);

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
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        beginQuickNote();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [beginQuickNote, beginVoice]);

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
      if (wasInactive) {
        setCompactFocus(true);
        goToPanel('today');
      }
    });
    const unlistenClear = listen('session-cleared', () => {
      sessionRef.current = null;
      setSession(null);
      setCompactFocus(true);
      setNudgeVisible(false);
      setChatMessages([]);
      goToPanel('today');
      refreshDigest();
    });
    const unlistenMessages = listen('session-messages', (event) => {
      setChatMessages(event.payload?.messages || []);
    });
    return () => {
      unlistenUpdate.then((fn) => fn());
      unlistenClear.then((fn) => fn());
      unlistenMessages.then((fn) => fn());
    };
  }, [goToPanel, refreshDigest]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    const unlistenCompact = listen('widget-compact', () => {
      setCompactFocus(true);
      setAssistantResult(null);
      setNudgeVisible(false);
      goToPanel('today');
    });
    const unlistenExpanded = listen('widget-expanded', () => {
      setCompactFocus(false);
      setNudgeVisible(false);
      goToPanel('today');
    });
    return () => {
      unlistenCompact.then((fn) => fn());
      unlistenExpanded.then((fn) => fn());
    };
  }, [goToPanel]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    const unlisten = listen('assistant-hotkey', () => {
      beginVoice();
    });
    return () => unlisten.then((fn) => fn());
  }, [beginVoice]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    const unlisten = listen('quick-note-hotkey', beginQuickNote);
    return () => unlisten.then((fn) => fn());
  }, [beginQuickNote]);

  // Refetches each time the tab is opened rather than caching — the lists are
  // small, and this keeps the widget honest about what changed elsewhere in
  // the app without needing invalidation logic.
  useEffect(() => {
    if (panel === 'tasks') fetchTasks();
    if (panel === 'notes') fetchRecentNotes();
  }, [panel, fetchTasks, fetchRecentNotes]);

  const topApp = activitySummary.todayFocusApps?.[0] || activitySummary.todayTopApps?.[0] || null;
  const firstName = user?.firstName?.trim() || 'there';

  if (session && compactFocus && panel !== 'notes' && voiceState === 'idle' && !assistantResult) {
    return (
      <CompactFocusWidget
        session={session}
        nudgesEnabled={nudgesEnabled}
        nudgeIndex={nudgeIndex}
        nudgeVisible={nudgeVisible}
        onDismissNudge={() => setNudgeVisible(false)}
        onTogglePause={() => sendAction('pause')}
        onExpand={expandFocusWidget}
      />
    );
  }

  const taskCount = tasks.filter((t) => getTaskStatus(t) !== TASK_STATUS.DONE).length;

  const header = (
    <div className="flex shrink-0 flex-col gap-0">
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-[7px] bg-[#dc7954] text-white">
            <FolderKanban className="h-3 w-3" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">Collab</span>
        </div>
        <div className="flex items-center gap-1.5">
          {session ? (
            <>
              <button type="button" title="Minimize Focus Room controls" onClick={collapseFocusWidget} className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"><ChevronUp className="h-3.5 w-3.5" /></button>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-4))]" />Live</div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-numeric text-[9px] text-muted-foreground">{format(new Date(), 'EEE d')}</span>
              <button type="button" title={panel === 'notifications' ? 'Back to today' : 'Notifications'} onClick={() => goToPanel(panel === 'notifications' ? 'today' : 'notifications')} className="relative flex h-7 w-7 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground">
                <Bell className="h-3.5 w-3.5" />
                {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center border-b border-border/40" aria-label="Widget sections">
        {WIDGET_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = panel === tab.key || (tab.key === 'today' && panel === 'notifications');
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setAssistantResult(null); goToPanel(tab.key); }}
              className={`relative flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[12px] font-medium transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.key === 'tasks' && taskCount > 0 && (
                <span className="text-[10px] text-muted-foreground">·{taskCount}</span>
              )}
              {active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#dc7954]" />}
            </button>
          );
        })}
      </div>
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
                  <button type="button" key={source.id} title={source.excerpt} onClick={() => source.route && sendAction('open-route', { route: source.route })} className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-1.5 py-1 text-[9px] font-medium text-primary transition-colors hover:bg-primary/20">
                    <FileText className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{source.type?.toLowerCase()} · {source.title}</span>
                  </button>
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

  const showGlobalComposer = voiceState === 'idle' && panel !== 'notes' && panel !== 'tasks' && panel !== 'chat'
    && (!session || panel === 'notifications' || assistantResult);

  return (
    <div className="h-screen w-screen bg-transparent">
      <div className="flex h-full w-full flex-col gap-3 rounded-[28px] border border-border/50 bg-card/80 p-4 shadow-ios-lg ring-1 ring-black/5 backdrop-blur-2xl dark:ring-white/5">
        {header}

        {assistantView || (panel === 'tasks' ? (
          <TasksTab
            tasks={tasks}
            loaded={tasksLoaded}
            filter={taskFilter}
            onFilterChange={setTaskFilter}
            onComplete={completeTask}
            draft={taskDraft}
            onDraftChange={setTaskDraft}
            onAdd={addTask}
            adding={addingTask}
          />
        ) : panel === 'chat' ? (
          <ChatTab
            session={session}
            messages={chatMessages}
            currentUserEmail={user?.email}
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onSend={sendChatMessage}
          />
        ) : panel === 'notes' ? (
          <QuickNoteSurface
            value={quickNoteText}
            onChange={setQuickNoteText}
            onSave={saveQuickNote}
            onCancel={clearNoteDraft}
            onToggleVoice={toggleVoice}
            voiceState={voiceState}
            saving={savingNote}
            recentNotes={recentNotes}
          />
        ) : panel === 'notifications' ? (
          <>
            <div className="animate-in fade-in slide-in-from-left-2 flex shrink-0 items-end justify-between duration-200"><div><p className="text-sm font-semibold text-foreground">Recent activity</p><p className="mt-0.5 text-[10px] text-muted-foreground">Your latest signals from Collab</p></div><Bell className="mb-1 h-4 w-4 text-muted-foreground" /></div>
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

        {showGlobalComposer && <Composer value={command} onChange={setCommand} onSubmit={(event) => { event.preventDefault(); runAssistant(command); }} onToggleVoice={toggleVoice} voiceState={voiceState} />}
      </div>
    </div>
  );
};

export default WidgetPage;
