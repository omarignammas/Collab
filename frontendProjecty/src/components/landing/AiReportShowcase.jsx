import { useEffect, useState } from 'react';
import { MessageSquare, StickyNote, Sparkles, Loader2 } from 'lucide-react';
import Avatar from '../shared/Avatar';

const MESSAGES = [
  { name: 'Mira', text: 'starting with chapter 4 practice problems' },
  { name: 'You', text: 'same, then moving to the lab write-up' },
  { name: 'Deniz', text: 'can share my notes on osmosis after' },
];

const NOTE = { title: 'Lab write-up', body: 'Cite the buffer solution results from part 2 before submitting.' };

const REPORT_LINES = [
  'Worked through Chapter 4 practice problems together',
  'Mira and You focused on the lab write-up',
  'Deniz shared notes on osmosis for the group',
  'Next up: Problem Set 2, due Friday',
];

// key order doubles as the timeline this component walks through, on a loop
const STAGES = [
  { key: 'msg-1', duration: 900 },
  { key: 'msg-2', duration: 900 },
  { key: 'msg-3', duration: 900 },
  { key: 'note', duration: 1100 },
  { key: 'generating', duration: 1700 },
  { key: 'ready', duration: 3400 },
];
const STAGE_KEYS = STAGES.map((s) => s.key);

export const AiReportShowcase = () => {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    let timeoutId = setTimeout(function step(idx = 0) {
      const nextIdx = (idx + 1) % STAGES.length;
      setStageIdx(nextIdx);
      timeoutId = setTimeout(() => step(nextIdx), STAGES[nextIdx].duration);
    }, STAGES[0].duration);
    return () => clearTimeout(timeoutId);
  }, []);

  const stage = STAGE_KEYS[stageIdx];
  const atLeast = (key) => stageIdx >= STAGE_KEYS.indexOf(key);

  const visibleMessages = atLeast('msg-1') ? (atLeast('msg-3') ? 3 : atLeast('msg-2') ? 2 : 1) : 0;
  const showNote = atLeast('note') && !atLeast('generating');
  const generating = stage === 'generating';
  const ready = stage === 'ready';

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Left: live session mini mock — chat, then notes */}
      <div className="h-[300px] rounded-xl border border-border/80 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Deep Work Sprint</p>
            <p className="text-xs text-muted-foreground">Focus Room · session</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            live
          </span>
        </div>

        <div className="mb-3 flex gap-1 rounded-md border border-border/60 p-0.5 text-xs">
          <span
            className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 transition-colors duration-150 ${
              !showNote ? 'bg-accent text-foreground' : 'text-muted-foreground'
            }`}
          >
            <MessageSquare className="h-3 w-3" /> Chat
          </span>
          <span
            className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 transition-colors duration-150 ${
              showNote ? 'bg-accent text-foreground' : 'text-muted-foreground'
            }`}
          >
            <StickyNote className="h-3 w-3" /> Notes
          </span>
        </div>

        <div className="min-h-[136px] space-y-2.5">
          {!showNote ? (
            MESSAGES.map((m, i) => (
              <div
                key={m.name + i}
                className={`flex items-start gap-2 text-xs transition-all duration-500 ${
                  i < visibleMessages ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
                }`}
              >
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{m.name}</span>{' '}
                  <span className="text-muted-foreground">{m.text}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-1 rounded-md border border-border/60 bg-background p-3 duration-500">
              <p className="text-xs font-medium text-foreground">{NOTE.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{NOTE.body}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: AI report card — mirrors the real in-app "AI session report" card */}
      <div className="relative flex h-[300px] flex-col rounded-xl border border-border/80 bg-card p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className={`h-4 w-4 text-primary ${generating ? 'animate-pulse' : ''}`} />
          AI session report
        </p>

        <div className="min-h-[16px]">
          {!generating && !ready && <p className="text-xs text-muted-foreground">Waiting for the session to wrap up…</p>}
          {generating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Generating your recap…
            </div>
          )}
        </div>

        <div className="mt-2 space-y-2">
          {REPORT_LINES.map((line, i) => (
            <p
              key={line}
              className={`text-xs leading-relaxed text-muted-foreground transition-all duration-500 ${
                ready ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-1 opacity-0'
              }`}
              style={{ transitionDelay: ready ? `${i * 150}ms` : '0ms' }}
            >
              <span className="mr-1.5 text-primary">·</span>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AiReportShowcase;
