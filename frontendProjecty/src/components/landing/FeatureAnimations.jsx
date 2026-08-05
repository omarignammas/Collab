import { useState, useEffect } from 'react';
import { Sparkles, Layers, Check } from 'lucide-react';

// "Collab is in the room" — a mention, a thinking beat, then a reply bubble.
export const AiChatAnimation = () => {
  const [phase, setPhase] = useState(0); // 0: question only, 1: thinking, 2: reply

  useEffect(() => {
    const durations = [700, 900, 1700];
    let timeoutId;
    const step = (p) => {
      timeoutId = setTimeout(() => {
        const next = (p + 1) % durations.length;
        setPhase(next);
        step(next);
      }, durations[p]);
    };
    step(0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="mb-4 flex h-24 flex-col justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5">
      <div className="flex justify-end">
        <span className="rounded-2xl rounded-br-sm bg-primary px-2 py-1 text-[10px] text-primary-foreground">collab, summarize this</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
        {phase === 1 && <span className="text-[9px] text-muted-foreground">thinking…</span>}
        {phase === 2 && (
          <span className="animate-in fade-in rounded-2xl rounded-bl-sm border border-primary/30 bg-card px-2 py-1 text-[10px] text-foreground duration-300">
            Here's the gist —
          </span>
        )}
      </div>
    </div>
  );
};

// "Notes everyone builds on" — a shared topic thread, contributor lines stacking in.
const NOTE_LINES = ['Divide step: O(log n)', 'Merge step: O(n) per level'];

export const NotesAnimation = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCount((c) => (c + 1) % (NOTE_LINES.length + 1)), 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-4 flex h-24 flex-col justify-center gap-1 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5">
      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-foreground">
        <Layers className="h-3 w-3 text-primary" />
        Merge Sort — Review
      </p>
      <div className="space-y-1 border-l border-border/60 pl-2">
        {NOTE_LINES.map((line, i) => (
          <p
            key={line}
            className={`truncate text-[9px] text-muted-foreground transition-all duration-500 ${
              i < count ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0'
            }`}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};

// "Tasks that track themselves" — checking a task off flips its status pill live.
export const TasksBoardAnimation = () => {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCompleted((c) => !c), 1700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-4 flex h-24 flex-col justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-2.5 py-2 shadow-sm">
        <span
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 transition-colors duration-300 ${
            completed ? 'border-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-fg))]' : 'border-border'
          }`}
        >
          {completed && <Check className="h-2.5 w-2.5 text-white" />}
        </span>
        <span className={`truncate text-[11px] transition-colors duration-300 ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          Problem Set 5
        </span>
      </div>
      <div className="flex justify-end">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-300 ${completed ? 'pill-done' : 'pill-in-progress'}`}>
          {completed ? 'Done' : 'In Progress'}
        </span>
      </div>
    </div>
  );
};

// "AI-planned roadmaps" — a generated task breakdown lands one row at a time.
const ROADMAP_TASKS = ['Define scope', 'Build wireframes', 'Set up repo', 'Deploy live'];

export const RoadmapAnimation = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCount((c) => (c + 1) % (ROADMAP_TASKS.length + 1)), 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-4 flex h-24 flex-col justify-center gap-1 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5">
      {ROADMAP_TASKS.map((t, i) => (
        <div
          key={t}
          className={`flex items-center gap-1.5 text-[10px] transition-all duration-400 ${
            i < count ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'
          }`}
        >
          <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-2 w-2" />
          </span>
          <span className="truncate text-foreground">{t}</span>
        </div>
      ))}
    </div>
  );
};
