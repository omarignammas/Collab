import { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Home,
  ListTodo,
  LayoutGrid,
  CalendarDays,
  Timer,
  Users,
  NotebookText,
  BarChart3,
  AlertTriangle,
  Settings,
  User,
  Moon,
  Bell,
  Hand,
  Check,
  MessageSquare,
  Sparkles,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { CircularProgress } from '../shared/CircularProgress';
import Avatar from '../shared/Avatar';

const TAB_ORDER = ['focus', 'dashboard', 'tasks', 'courses', 'calendar'];
const AUTO_ADVANCE_MS = 5200;
// The focus tab now plays out a full two-round AI conversation (question →
// answer, then a follow-up that gets resource links) — it needs much longer
// on screen than the other tabs' shorter, simpler animations.
const FOCUS_TAB_ADVANCE_MS = 16000;

// Mirrors Sidebar.jsx's NAV_ITEMS exactly — only the ones with a tabKey have
// a mockup screen behind them in this preview; the rest render for visual
// fidelity but aren't clickable, same as a real sidebar with nothing to show yet.
const SIDEBAR_NAV = [
  { label: 'Dashboard', icon: Home, tabKey: 'dashboard' },
  { label: 'Tasks', icon: ListTodo, tabKey: 'tasks' },
  { label: 'Courses', icon: LayoutGrid, tabKey: 'courses' },
  { label: 'Calendar', icon: CalendarDays, tabKey: 'calendar' },
  { label: 'Focus Rooms', icon: Timer, tabKey: 'focus' },
  { label: 'Friends', icon: Users },
  { label: 'Notes', icon: NotebookText },
  { label: 'Stats', icon: BarChart3 },
  { label: 'Overdue', icon: AlertTriangle },
];

const SIDEBAR_BOTTOM = [
  { label: 'Settings', icon: Settings },
  { label: 'Profile', icon: User },
];

const NavIcon = ({ item, active, onSelect }) => (
  <button
    type="button"
    onClick={item.tabKey ? () => onSelect(item.tabKey) : undefined}
    title={item.label}
    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
      item.tabKey && active === item.tabKey
        ? 'bg-primary/15 text-primary'
        : item.tabKey
        ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
        : 'cursor-default text-muted-foreground/50'
    }`}
  >
    <item.icon className="h-4 w-4" />
  </button>
);

const DASHBOARD_TASKS = [
  { title: 'Lab Report 3 — Organic Chemistry', priority: 'high', due: 'Today' },
  { title: 'Assignment 5: Graph Algorithms', priority: 'medium', due: 'Tomorrow' },
  { title: 'Reading: Chapter 6', priority: 'low', due: 'Fri' },
];

const DashboardScreen = () => (
  <div className="p-4 sm:p-5">
    <p className="text-sm font-bold text-foreground">Dashboard</p>
    <p className="mb-3 text-[11px] text-muted-foreground">Everything due, at a glance.</p>

    <div className="mb-3 inline-flex gap-1 rounded-lg border border-border/70 bg-card/60 p-1 text-[10px]">
      {['Today', 'Tomorrow', 'Week', 'Month', 'Priority'].map((t, i) => (
        <span key={t} className={`rounded px-2 py-1 ${i === 0 ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground'}`}>
          {t}
        </span>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_150px]">
      <div className="space-y-2">
        {DASHBOARD_TASKS.map((task) => (
          <div key={task.title} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/60 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-3.5 w-3.5 shrink-0 rounded-sm border-2 border-border" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-foreground">{task.title}</p>
                <p className="text-[9px] text-muted-foreground">Due {task.due}</p>
              </div>
            </div>
            <span className={`pill-priority-${task.priority} shrink-0 rounded px-1.5 py-0.5 text-[9px] capitalize`}>{task.priority}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/70 bg-card/60 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">stats</p>
        <div className="space-y-1.5 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Due Today</span><span className="font-numeric font-semibold text-foreground">3</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Due This Week</span><span className="font-numeric font-semibold text-foreground">8</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className="font-numeric font-semibold text-destructive">5</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">In Progress</span><span className="font-numeric font-semibold text-foreground">9</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-numeric font-semibold text-[hsl(var(--status-done-fg))]">7</span></div>
        </div>
      </div>
    </div>
  </div>
);

const PROJECT_PORTFOLIO = [
  {
    name: 'Launch landing refresh',
    type: 'Marketing sprint',
    progress: 64,
    health: 'On track',
    due: 'Fri',
    owner: 'Omar',
    color: 'bg-[hsl(var(--chart-1))]',
    team: ['OM', 'MR', 'DN'],
    tasks: [
      { title: 'Rewrite hero message', assignee: 'Mira', priority: 'high', status: 'Assigned' },
      { title: 'Build app animation', assignee: 'Omar', priority: 'medium', status: 'In progress' },
      { title: 'QA mobile spacing', assignee: 'Deniz', priority: 'low', status: 'Review' },
    ],
  },
  {
    name: 'AI study report',
    type: 'Research workflow',
    progress: 48,
    health: 'Needs review',
    due: 'Mon',
    owner: 'Mira',
    color: 'bg-[hsl(var(--chart-4))]',
    team: ['MR', 'OM'],
    tasks: [
      { title: 'Collect source links', assignee: 'Mira', priority: 'medium', status: 'Assigned' },
      { title: 'Generate benchmark table', assignee: 'Collab', priority: 'high', status: 'In progress' },
      { title: 'Summarize final report', assignee: 'Omar', priority: 'medium', status: 'Queued' },
    ],
  },
  {
    name: 'Focus room beta',
    type: 'Product release',
    progress: 78,
    health: 'Shipping',
    due: 'Today',
    owner: 'Deniz',
    color: 'bg-[hsl(var(--chart-3))]',
    team: ['DN', 'OM', 'CL'],
    tasks: [
      { title: 'Invite test cohort', assignee: 'Deniz', priority: 'high', status: 'Assigned' },
      { title: 'Review session notes', assignee: 'Omar', priority: 'medium', status: 'In progress' },
      { title: 'Publish release brief', assignee: 'Collab', priority: 'low', status: 'Done' },
    ],
  },
];

const FLOW_STAGES = [
  { label: 'Assigned', detail: 'Owner picked' },
  { label: 'In progress', detail: 'Work starts' },
  { label: 'Done', detail: 'Portfolio updates' },
];

const CoursesScreen = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => setTick((value) => value + 1), 1500);
    return () => clearInterval(intervalId);
  }, []);

  const projectIndex = Math.floor(tick / FLOW_STAGES.length) % PROJECT_PORTFOLIO.length;
  const flowIndex = tick % FLOW_STAGES.length;
  const project = PROJECT_PORTFOLIO[projectIndex];
  const movingTask = project.tasks[flowIndex % project.tasks.length];

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-foreground">My Projects Portfolio</p>
          <p className="text-xs text-muted-foreground">Projects, owners, assigned tasks, and progress in one place.</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3 w-3" />
          New Project
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-2.5">
          {PROJECT_PORTFOLIO.map((item, index) => {
            const activeProject = index === projectIndex;
            return (
              <div
                key={item.name}
                className={`rounded-lg border p-3 transition-all duration-500 ${
                  activeProject
                    ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border/70 bg-card/60'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                      {item.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{item.type}</p>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] ${activeProject ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
                    {item.health}
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${item.progress}%` }} />
                  </div>
                  <span className="font-numeric text-[9px] font-semibold text-foreground">{item.progress}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {item.team.length} members
                  </span>
                  <span>Due {item.due}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border/70 bg-card/60 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
                <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                {project.name}
              </p>
              <p className="text-[10px] text-muted-foreground">Owner: {project.owner} · {project.type}</p>
            </div>
            <CircularProgress percentage={project.progress} size={44} strokeWidth={4} color="orange" />
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {FLOW_STAGES.map((stage, index) => (
              <div
                key={stage.label}
                className={`min-h-[58px] rounded-lg border p-2 transition-all duration-500 ${
                  index === flowIndex
                    ? 'border-primary/50 bg-primary/10'
                    : index < flowIndex
                    ? 'border-[hsl(var(--status-done-fg)/0.35)] bg-[hsl(var(--status-done-bg))]'
                    : 'border-border/60 bg-background/50'
                }`}
              >
                <p className="text-[10px] font-semibold text-foreground">{stage.label}</p>
                <p className="mt-0.5 text-[8px] text-muted-foreground">{stage.detail}</p>
                {index === flowIndex && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/15">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                Live task flow
              </p>
              <span className="rounded bg-background/70 px-1.5 py-0.5 text-[8px] text-muted-foreground">{FLOW_STAGES[flowIndex].label}</span>
            </div>
            <p className="truncate text-[11px] font-medium text-foreground">{movingTask.title}</p>
            <p className="text-[9px] text-muted-foreground">Assigned to {movingTask.assignee} · {movingTask.priority} priority</p>
          </div>

          <div className="space-y-1.5">
            {project.tasks.map((task, index) => {
              const activeTask = index === flowIndex;
              const doneTask = task.status === 'Done' || index < flowIndex;
              return (
                <div
                  key={task.title}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition-all duration-500 ${
                    activeTask ? 'border-primary/50 bg-background shadow-sm' : 'border-border/60 bg-background/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-[10px] font-medium ${doneTask ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</p>
                    <p className="text-[8px] text-muted-foreground">{task.assignee}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`pill-priority-${task.priority} rounded px-1 py-0.5 text-[8px] capitalize`}>{task.priority}</span>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${doneTask ? 'border-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-fg))]' : 'border-border'}`}>
                      {doneTask && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const STATUS_PILL = { progress: 'pill-in-progress', overdue: 'pill-overdue', done: 'pill-done' };
const STATUS_LABEL = { progress: 'In Progress', overdue: 'Overdue', done: 'Done' };

const TODO_CARDS = [
  { title: 'Assignment 5: Graph Algorithms', priority: 'medium', course: 'Data Structures' },
  { title: 'Reading: Chapter 6', priority: 'low', course: 'Microeconomics' },
];
const OVERDUE_CARDS = [
  { title: 'Lab Report 3', priority: 'high', course: 'Organic Chemistry 201' },
  { title: 'Problem Set 2', priority: 'medium', course: 'Microeconomics' },
];
const DONE_CARDS = [
  { title: 'Quiz 2: Sorting Algorithms', priority: 'low', course: 'Data Structures' },
  { title: 'Midterm Exam 2', priority: 'high', course: 'Organic Chemistry 201' },
];
const TRAVEL_CARD = { title: 'Problem Set 5', priority: 'medium', course: 'Intro to Microeconomics' };

const CARD_HEIGHT = 64;
const COLUMN_HEADER_HEIGHT = 24;
const CARD_GAP = 6;

const MiniTaskCard = ({ title, priority, course, status, checked, className = '' }) => (
  <div
    className={`flex flex-col justify-between rounded-md border border-border/70 bg-card/80 p-2 ${className}`}
    style={{ height: CARD_HEIGHT }}
  >
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border-2 transition-colors duration-300 ${
          checked ? 'border-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-fg))]' : 'border-border'
        }`}
      >
        {checked && <Check className="h-2 w-2 text-white" />}
      </span>
      <p className={`truncate text-[10px] ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{title}</p>
    </div>
    <div className="flex flex-wrap gap-1 pl-[18px]">
      {status && <span className={`${STATUS_PILL[status]} rounded px-1 py-0.5 text-[8px]`}>{STATUS_LABEL[status]}</span>}
      <span className={`pill-priority-${priority} rounded px-1 py-0.5 text-[8px] capitalize`}>{priority}</span>
    </div>
    <p className="truncate pl-[18px] text-[8px] text-muted-foreground">{course}</p>
  </div>
);

const PHASES = [
  { key: 'todo', duration: 1600 },
  { key: 'moving', duration: 900 },
  { key: 'done', duration: 1900 },
];

const TasksScreen = () => {
  const [phase, setPhase] = useState('todo');

  useEffect(() => {
    let timeoutId = setTimeout(function step(idx = 0) {
      const nextIdx = (idx + 1) % PHASES.length;
      setPhase(PHASES[nextIdx].key);
      timeoutId = setTimeout(() => step(nextIdx), PHASES[nextIdx].duration);
    }, PHASES[0].duration);
    return () => clearTimeout(timeoutId);
  }, []);

  const cardLeft = phase === 'todo' ? '1%' : phase === 'done' ? '68.5%' : '34.5%';
  const isDone = phase === 'done';

  // The traveling card is absolutely positioned so it can slide between columns, so its
  // `top` has to land exactly below the two real cards in every column — otherwise it
  // floats mid-column and visually covers whatever's already there instead of reading
  // as the third/last card in the stack.
  const travelTop = 8 + COLUMN_HEADER_HEIGHT + 2 * CARD_HEIGHT + 2 * CARD_GAP;
  const columnHeight = 16 + COLUMN_HEADER_HEIGHT + 3 * CARD_HEIGHT + 2 * CARD_GAP;

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">Tasks</p>
        <div className="flex gap-1 rounded-md border border-border/70 p-0.5 text-[10px]">
          <span className="rounded px-2 py-1 text-muted-foreground">List</span>
          <span className="rounded bg-primary px-2 py-1 font-medium text-primary-foreground">Board</span>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-3" style={{ minHeight: columnHeight + 8 }}>
        <div className="rounded-lg border border-dashed border-border/70 p-2">
          <div className="flex items-center px-1" style={{ height: COLUMN_HEADER_HEIGHT }}>
            <p className="text-[10px] font-semibold text-foreground">to do</p>
          </div>
          <div className="space-y-1.5">
            {TODO_CARDS.map((c) => <MiniTaskCard key={c.title} {...c} status="progress" />)}
            <div className="opacity-0" style={{ height: CARD_HEIGHT }} aria-hidden="true" />
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border/70 p-2">
          <div className="flex items-center px-1" style={{ height: COLUMN_HEADER_HEIGHT }}>
            <p className="text-[10px] font-semibold text-foreground">overdue</p>
          </div>
          <div className="space-y-1.5">
            {OVERDUE_CARDS.map((c) => <MiniTaskCard key={c.title} {...c} status="overdue" />)}
            <div className="opacity-0" style={{ height: CARD_HEIGHT }} aria-hidden="true" />
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border/70 p-2">
          <div className="flex items-center px-1" style={{ height: COLUMN_HEADER_HEIGHT }}>
            <p className="text-[10px] font-semibold text-foreground">done</p>
          </div>
          <div className="space-y-1.5">
            {DONE_CARDS.map((c) => <MiniTaskCard key={c.title} {...c} status="done" checked />)}
            <div className="opacity-0" style={{ height: CARD_HEIGHT }} aria-hidden="true" />
          </div>
        </div>

        <div
          className="absolute w-[31%] shadow-lg transition-all ease-in-out"
          style={{ left: cardLeft, top: travelTop, transitionDuration: '900ms' }}
        >
          <MiniTaskCard {...TRAVEL_CARD} status={isDone ? 'done' : 'progress'} checked={isDone} className="border-primary/50" />
        </div>
      </div>
    </div>
  );
};

const CAL_EVENTS = {
  15: { label: 'Problem Set 1', cls: 'bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))] line-through' },
  17: { label: 'Assignment 3', cls: 'bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))] line-through' },
  20: { label: 'Problem Set 2', cls: 'bg-[hsl(var(--status-overdue-bg))] text-[hsl(var(--status-overdue-fg))]' },
  22: { label: 'Assignment 4', cls: 'bg-[hsl(var(--status-overdue-bg))] text-[hsl(var(--status-overdue-fg))]' },
  28: { label: 'Assignment 5', cls: 'bg-[hsl(var(--status-in-progress-bg))] text-[hsl(var(--status-in-progress-fg))]' },
  29: { label: 'Reading Ch.6', cls: 'bg-[hsl(var(--status-in-progress-bg))] text-[hsl(var(--status-in-progress-fg))]' },
};

const CalendarScreen = () => (
  <div className="p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm font-bold text-foreground">July 2026</p>
      <span className="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground">Today</span>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <span key={`${d}-${i}`}>{d}</span>
      ))}
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
        <div key={d} className="flex min-h-[34px] flex-col items-center gap-0.5 rounded-md border border-border/50 bg-card/60 p-1">
          <span className={d === 28 ? 'flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground' : 'text-[10px] text-foreground'}>
            {d}
          </span>
          {CAL_EVENTS[d] && (
            <span className={`w-full truncate rounded px-1 text-[7px] ${CAL_EVENTS[d].cls}`}>{CAL_EVENTS[d].label}</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Regular room chat, then a question → "Collab is thinking…" → a reply bubble —
// mirrors the real Collab chat feature (ChatPanel.jsx), not just generic chat,
// so this preview stays a faithful screen of the actual app. Two back-to-back
// scenarios on purpose: an unmentioned question Collab picks up on its own
// (prose answer) and a direct "collab, ..." mention (list-of-links answer) —
// showing both trigger paths, not just one. `hold` is how long (ms) this
// message stays as the latest one before the next one appears — varied on
// purpose so the sequence reads like a real conversation rather than a metronome.
const CHAT_SCRIPT = [
  { id: 1, type: 'chat', sender: 'Deniz', body: 'starting problem set 2', hold: 1400 },
  { id: 2, type: 'chat', sender: 'You', body: "what's the big-O of merge sort again?", hold: 900 },
  { id: 3, type: 'system', body: 'Collab is thinking…', hold: 1600 },
  {
    id: 4,
    type: 'ai',
    body: 'Merge sort is O(n log n) in every case — split in half (log n levels), merge each level in linear time.',
    hold: 2600,
  },
  { id: 5, type: 'chat', sender: 'Mira', body: 'that makes sense 🙏', hold: 1800 },
  { id: 6, type: 'chat', sender: 'Deniz', body: 'anyone got good resources on this?', hold: 1600 },
  { id: 7, type: 'chat', sender: 'You', body: 'collab, drop some links', hold: 900 },
  { id: 8, type: 'system', body: 'Collab is thinking…', hold: 1600 },
  {
    id: 9,
    type: 'ai',
    body: 'A few worth a look:',
    links: ['Wikipedia — Merge sort', 'MIT OCW — Divide & Conquer', 'VisuAlgo — Sorting visualization'],
    hold: 3400,
  },
];

const FocusChatPanel = () => {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    let timeoutId;
    const step = (count) => {
      const hold = CHAT_SCRIPT[count - 1]?.hold ?? 1200;
      timeoutId = setTimeout(() => {
        const next = count < CHAT_SCRIPT.length ? count + 1 : 1;
        setVisibleCount(next);
        step(next);
      }, hold);
    };
    step(visibleCount);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-card/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        room chat
      </p>
      <div className="min-h-[210px] flex-1 space-y-1.5">
        {CHAT_SCRIPT.slice(0, visibleCount).map((m) => {
          if (m.type === 'system') {
            return (
              <p key={m.id} className="animate-in fade-in flex items-center justify-center gap-1 text-center text-[9px] text-muted-foreground duration-500">
                <Sparkles className="h-2.5 w-2.5 shrink-0 text-primary" />
                {m.body}
              </p>
            );
          }

          if (m.type === 'ai') {
            return (
              <div key={m.id} className="animate-in fade-in slide-in-from-bottom-1 flex items-end gap-1.5 duration-500">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-bl-sm border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[10px] leading-snug text-foreground shadow-sm">
                  {m.body}
                  {m.links && (
                    <ul className="mt-1 space-y-1">
                      {m.links.map((link) => (
                        <li key={link} className="flex items-center gap-1 text-primary">
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          <span className="text-foreground">{link}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`animate-in fade-in slide-in-from-bottom-1 flex duration-500 ${m.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-2.5 py-1.5 text-[10px] leading-snug shadow-sm ${
                  m.sender === 'You'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-accent text-foreground'
                }`}
              >
                {m.sender !== 'You' && (
                  <span className="mb-0.5 block text-[8px] font-semibold text-primary">{m.sender}</span>
                )}
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Mirrors SessionNotes.jsx's topic-grouped shape — one topic, contributor
// notes stacking in one at a time.
const NOTES_SCRIPT = {
  title: 'Merge Sort — Midterm Review',
  notes: [
    { id: 1, name: 'Mira', body: 'Divide step is O(log n) levels of recursion.' },
    { id: 2, name: 'Deniz', body: 'Merge step is O(n) per level → O(n log n) total.' },
  ],
};

const FocusNotesPanel = () => {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((c) => (c < NOTES_SCRIPT.notes.length ? c + 1 : 1));
    }, 1700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-card/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Layers className="h-3.5 w-3.5 text-primary" />
        session notes
      </p>
      <div className="min-h-[210px] flex-1">
        <div className="rounded-lg border border-border/60 bg-card p-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
            <Layers className="h-3 w-3 shrink-0 text-primary" />
            {NOTES_SCRIPT.title}
          </p>
          <div className="space-y-2 border-l border-border/60 pl-2.5">
            {NOTES_SCRIPT.notes.slice(0, visibleCount).map((note) => (
              <div key={note.id} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Avatar name={note.name} size="sm" />
                  <span className="text-[9px] font-medium text-foreground">{note.name}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">{note.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FocusScreen = () => (
  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[0.85fr_1fr_1fr] sm:p-5">
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/70 bg-card/60 p-5">
        <p className="section-header">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          Focus · Round 2/4
        </p>
        <CircularProgress percentage={68} size={96} strokeWidth={7} color="orange">
          <div className="flex flex-col items-center">
            <p className="font-numeric text-lg font-bold text-foreground">18:24</p>
            <p className="text-[9px] text-muted-foreground">remaining</p>
          </div>
        </CircularProgress>
      </div>
      <div className="rounded-lg border border-border/70 bg-card/60 p-3">
        <p className="mb-2 text-[10px] font-semibold text-muted-foreground">participants (3)</p>
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground"><span className="h-2 w-2 rounded-full bg-[hsl(var(--status-done-fg))]" />You</span>
            <span className="text-[9px] text-muted-foreground">focusing</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground"><span className="h-2 w-2 rounded-full bg-[hsl(var(--status-done-fg))]" />Mira</span>
            <span className="text-[9px] text-muted-foreground">focusing</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground"><Hand className="h-3.5 w-3.5 text-primary" />Deniz</span>
            <span className="text-[9px] text-muted-foreground">on break</span>
          </div>
        </div>
      </div>
    </div>

    <FocusNotesPanel />
    <FocusChatPanel />
  </div>
);

const SCREENS = {
  dashboard: DashboardScreen,
  courses: CoursesScreen,
  tasks: TasksScreen,
  calendar: CalendarScreen,
  focus: FocusScreen,
};

export const ScreensShowcase = () => {
  const [active, setActive] = useState(TAB_ORDER[0]);
  const ActiveScreen = SCREENS[active];

  // Auto-plays through every tab on its own — a manual click just jumps
  // there immediately and the countdown to the next tab restarts from it.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const idx = TAB_ORDER.indexOf(active);
      setActive(TAB_ORDER[(idx + 1) % TAB_ORDER.length]);
    }, active === 'focus' ? FOCUS_TAB_ADVANCE_MS : AUTO_ADVANCE_MS);
    return () => clearTimeout(timeoutId);
  }, [active]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl shadow-black/5">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--priority-medium-fg))]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--status-done-fg))]/60" />
          <span className="ml-3 text-xs text-muted-foreground">app.collab.app</span>
        </div>

        <div className="flex">
          {/* mini sidebar — mirrors Sidebar.jsx */}
          <div className="flex w-14 shrink-0 flex-col items-center border-r border-border/70 bg-background/40 py-3">
            <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
              <Plus className="h-3.5 w-3.5" />
            </span>

            <nav className="flex flex-1 flex-col justify-between">
              <ul className="space-y-1">
                {SIDEBAR_NAV.map((item) => (
                  <li key={item.label}>
                    <NavIcon item={item} active={active} onSelect={setActive} />
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 border-t border-border/70 pt-2">
                {SIDEBAR_BOTTOM.map((item) => (
                  <li key={item.label}>
                    <NavIcon item={item} active={active} onSelect={setActive} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* main column — mirrors AppShell.jsx */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border/60 px-4 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground">
                <Moon className="h-3.5 w-3.5" />
              </span>
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground">
                <Bell className="h-3.5 w-3.5" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card py-1 pl-1 pr-2.5">
                <Avatar name="Omaritos" size="sm" />
                <span className="text-xs text-foreground">Omaritos</span>
              </span>
            </div>

            <div key={active} className="min-w-0 flex-1 animate-in fade-in duration-300">
              <ActiveScreen />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreensShowcase;
