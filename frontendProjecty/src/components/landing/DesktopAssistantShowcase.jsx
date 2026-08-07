import { useEffect, useState } from 'react';
import {
  AudioLines,
  CheckCircle2,
  Mail,
  MessageSquare,
  Mic,
  MessagesSquare,
  Search,
  Slack,
  Sparkles,
  Trello,
} from 'lucide-react';

const TOOLS = [
  { name: 'Slack', icon: Slack, tone: 'text-[#36c5f0]', active: 'border-[#36c5f0]/50 bg-[#36c5f0]/10' },
  { name: 'Trello', icon: Trello, tone: 'text-[#0c66e4]', active: 'border-[#0c66e4]/50 bg-[#0c66e4]/10' },
  { name: 'Discord', icon: MessagesSquare, tone: 'text-[#5865f2]', active: 'border-[#5865f2]/50 bg-[#5865f2]/10' },
  { name: 'Gmail', icon: Mail, tone: 'text-[#ea4335]', active: 'border-[#ea4335]/50 bg-[#ea4335]/10' },
  { name: 'Teams', icon: MessageSquare, tone: 'text-[#6264a7]', active: 'border-[#6264a7]/50 bg-[#6264a7]/10' },
];

const STAGES = [
  { label: 'Ready when you are', detail: 'Ask Collab to find the signal across your connected tools.' },
  { label: 'Listening', detail: '“Show me the last five emails in Gmail and unanswered Teams messages.”' },
  { label: 'Searching your workspace', detail: 'Checking Gmail and Teams, then grouping the useful next steps.' },
  { label: 'Brief ready', detail: 'Two sources found. Here is the short version, with actions attached.' },
];

const Waveform = ({ active }) => (
  <div className="flex h-6 items-center gap-0.5" aria-hidden="true">
    {[5, 9, 14, 8, 18, 11, 6, 15, 9, 5, 12, 7].map((height, index) => (
      <span
        key={index}
        className={`w-0.5 rounded-full transition-all duration-500 ${active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/35'}`}
        style={{ height: `${active ? height : Math.max(4, height / 2)}px`, animationDelay: `${index * 70}ms` }}
      />
    ))}
  </div>
);

const ToolNode = ({ tool, active }) => {
  const Icon = tool.icon;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-500 ${active ? tool.active : 'border-border/70 bg-background/50'}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background/80 ${tool.tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[11px] font-medium text-foreground">{tool.name}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
    </div>
  );
};

export const DesktopAssistantShowcase = () => {
  const [stage, setStage] = useState(0);
  const hasAnswer = stage === 3;
  const isSearching = stage === 2;

  useEffect(() => {
    const timer = setInterval(() => setStage((current) => (current + 1) % STAGES.length), 3600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-black/10">
      <div className="border-b border-border/70 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">One voice command. Every workspace.</p>
            <p className="mt-1 text-xs text-muted-foreground">Collab listens, searches, and returns a useful brief without making you open five tabs.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live demo
          </span>
        </div>
      </div>

      <div className="relative px-4 py-7 sm:px-8 sm:py-9">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="22" y1="18" x2="44" y2="44" className={stage >= 2 ? 'stroke-primary/60' : 'stroke-border'} strokeWidth="0.35" strokeDasharray="1.5 1.5" />
          <line x1="22" y1="50" x2="44" y2="50" className={stage >= 2 ? 'stroke-primary/60' : 'stroke-border'} strokeWidth="0.35" strokeDasharray="1.5 1.5" />
          <line x1="22" y1="82" x2="44" y2="56" className={stage >= 2 ? 'stroke-primary/60' : 'stroke-border'} strokeWidth="0.35" strokeDasharray="1.5 1.5" />
          <line x1="78" y1="27" x2="56" y2="45" className={stage >= 2 ? 'stroke-primary/60' : 'stroke-border'} strokeWidth="0.35" strokeDasharray="1.5 1.5" />
          <line x1="78" y1="73" x2="56" y2="55" className={stage >= 2 ? 'stroke-primary/60' : 'stroke-border'} strokeWidth="0.35" strokeDasharray="1.5 1.5" />
        </svg>

        <div className="relative grid min-h-[270px] grid-cols-[minmax(0,0.8fr)_minmax(118px,1.2fr)_minmax(0,0.8fr)] items-center gap-3 sm:min-h-[300px] sm:grid-cols-[1fr_1.35fr_1fr] sm:gap-7">
          <div className="space-y-3">
            {TOOLS.slice(0, 3).map((tool) => <ToolNode key={tool.name} tool={tool} active={stage >= 2} />)}
          </div>

          <div className="relative z-10 flex min-h-[176px] flex-col items-center justify-center rounded-[24px] border border-primary/35 bg-background/90 px-3 py-4 text-center shadow-xl shadow-primary/10 backdrop-blur-sm sm:min-h-[190px]">
            <span className={`absolute -inset-2 rounded-[30px] border border-primary/20 ${stage === 1 || isSearching ? 'animate-pulse' : ''}`} />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              {stage === 1 ? <Mic className="h-5 w-5 animate-pulse" /> : isSearching ? <Search className="h-5 w-5 animate-pulse" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <p className="mt-3 text-xs font-semibold text-foreground">Collab</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{stage === 1 ? 'Listening to you' : isSearching ? 'Connecting the dots' : 'Your work, in one place'}</p>
            <Waveform active={stage === 1 || isSearching} />
          </div>

          <div className="space-y-3">
            {TOOLS.slice(3).map((tool) => <ToolNode key={tool.name} tool={tool} active={stage >= 2} />)}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border/70 bg-background/65 px-3.5 py-3 sm:px-4">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${stage === 1 ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
              {stage === 1 ? <AudioLines className="h-3.5 w-3.5 animate-pulse" /> : <Mic className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-foreground">{STAGES[stage].label}</p>
                <span className="font-mono text-[9px] text-muted-foreground">{stage === 1 ? '00:04' : stage === 2 ? 'working' : 'voice mode'}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{STAGES[stage].detail}</p>
              <Waveform active={stage === 1} />
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-500 ${hasAnswer ? 'mt-4 max-h-40 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`} aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-[#ea4335]/25 bg-[#ea4335]/5 px-3 py-2.5">
              <Mail className="h-4 w-4 shrink-0 text-[#ea4335]" />
              <div className="min-w-0"><p className="text-[10px] font-semibold text-foreground">Gmail</p><p className="truncate text-[10px] text-muted-foreground">5 latest emails found</p></div>
              <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#6264a7]/25 bg-[#6264a7]/5 px-3 py-2.5">
              <MessageSquare className="h-4 w-4 shrink-0 text-[#6264a7]" />
              <div className="min-w-0"><p className="text-[10px] font-semibold text-foreground">Teams</p><p className="truncate text-[10px] text-muted-foreground">2 unanswered messages</p></div>
              <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopAssistantShowcase;
