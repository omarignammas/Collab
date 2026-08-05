import { useEffect, useState } from 'react';
import { FileText, Loader2, Sparkles, Workflow, ListChecks, CheckCircle2 } from 'lucide-react';

const SUMMARY_BULLETS = [
  'Nucleophilic substitution: SN1 vs. SN2 mechanisms compared',
  'Key intermediates: carbocations and transition states',
  'Rate laws — SN1 is unimolecular, SN2 is bimolecular',
];

const QUESTION = {
  text: 'Which mechanism proceeds through a carbocation intermediate?',
  options: ['SN2', 'SN1', 'E2', 'Radical substitution'],
  correctIndex: 1,
};

// key order doubles as the timeline this component walks through, on a loop
const STAGES = [
  { key: 'upload', duration: 900 },
  { key: 'extracting', duration: 1100 },
  { key: 'summarizing', duration: 1700 },
  { key: 'quiz-ready', duration: 900 },
  { key: 'answering', duration: 900 },
  { key: 'scored', duration: 3400 },
];
const STAGE_KEYS = STAGES.map((s) => s.key);

export const SummaryQuizShowcase = () => {
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

  const extracting = stage === 'extracting';
  const summarizing = atLeast('summarizing');
  const quizReady = atLeast('quiz-ready');
  const answering = atLeast('answering');
  const scored = stage === 'scored';

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Left: source upload → AI summary + diagram */}
      <div className="h-[300px] rounded-xl border border-border/80 bg-card p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className={`h-4 w-4 text-primary ${extracting ? 'animate-pulse' : ''}`} />
          AI course summary
        </p>

        <div className="flex items-center gap-2.5 rounded-md border border-border/60 bg-background p-2.5 text-xs">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">Organic_Chemistry_Ch7.pdf</p>
            <p className="text-muted-foreground">
              {extracting ? 'Reading document…' : summarizing ? '2.4 MB · processed' : '2.4 MB'}
            </p>
          </div>
          {extracting && <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
        </div>

        <div className="mt-3 min-h-[120px] space-y-2">
          {SUMMARY_BULLETS.map((line, i) => (
            <p
              key={line}
              className={`text-xs leading-relaxed text-muted-foreground transition-all duration-500 ${
                summarizing ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-1 opacity-0'
              }`}
              style={{ transitionDelay: summarizing ? `${i * 150}ms` : '0ms' }}
            >
              <span className="mr-1.5 text-primary">·</span>
              {line}
            </p>
          ))}

          <div
            className={`flex items-center gap-1.5 pt-1 transition-all duration-500 ${
              summarizing ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-1 opacity-0'
            }`}
            style={{ transitionDelay: summarizing ? `${SUMMARY_BULLETS.length * 150}ms` : '0ms' }}
          >
            <Workflow className="h-3 w-3 shrink-0 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Diagram</span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-[10px] transition-all duration-500 ${
              summarizing ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-1 opacity-0'
            }`}
            style={{ transitionDelay: summarizing ? `${(SUMMARY_BULLETS.length + 1) * 150}ms` : '0ms' }}
          >
            <span className="rounded-md border border-border/60 bg-background px-2 py-1 text-foreground">SN1</span>
            <span className="text-muted-foreground">→</span>
            <span className="rounded-md border border-border/60 bg-background px-2 py-1 text-foreground">Carbocation</span>
            <span className="text-muted-foreground">→</span>
            <span className="rounded-md border border-border/60 bg-background px-2 py-1 text-foreground">Product</span>
          </div>
        </div>
      </div>

      {/* Right: quiz generated from the same summary, auto-graded */}
      <div className="relative flex h-[300px] flex-col rounded-xl border border-border/80 bg-card p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks className="h-4 w-4 text-primary" />
          Quiz · Medium
        </p>

        <div className="min-h-[16px]">
          {!quizReady && <p className="text-xs text-muted-foreground">Waiting for the summary to finish…</p>}
        </div>

        {quizReady && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
            <p className="text-xs leading-relaxed text-foreground">{QUESTION.text}</p>
            <div className="mt-3 space-y-1.5">
              {QUESTION.options.map((opt, i) => {
                const isSelected = answering && i === QUESTION.correctIndex;
                const isCorrectReveal = scored && i === QUESTION.correctIndex;
                return (
                  <div
                    key={opt}
                    className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-all duration-300 ${
                      isCorrectReveal
                        ? 'border-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-fg)/0.1)] text-[hsl(var(--status-done-fg))]'
                        : isSelected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border/60 text-muted-foreground'
                    }`}
                  >
                    {opt}
                    {isCorrectReveal && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div
              className={`mt-3 flex items-center gap-1.5 text-xs transition-all duration-500 ${
                scored ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--status-done-fg))]" />
              <span className="text-foreground">4/5 correct</span>
              <span className="text-muted-foreground">· scored instantly</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryQuizShowcase;
