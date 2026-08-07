import { useEffect, useState } from 'react';
import {
  AudioLines,
  CheckCircle2,
  FolderKanban,
  LoaderCircle,
  Mic,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';

const BRAND_ICONS = {
  slack: {
    path: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
  },
  gmail: {
    path: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
  },
  trello: {
    path: 'M21.147 0H2.853A2.86 2.86 0 000 2.853v18.294A2.86 2.86 0 002.853 24h18.294A2.86 2.86 0 0024 21.147V2.853A2.86 2.86 0 0021.147 0zM10.34 17.287a.953.953 0 01-.953.953h-4a.954.954 0 01-.954-.953V5.38a.953.953 0 01.954-.953h4a.954.954 0 01.953.953zm9.233-5.467a.944.944 0 01-.953.947h-4a.947.947 0 01-.953-.947V5.38a.953.953 0 01.953-.953h4a.954.954 0 01.953.953z',
  },
  teams: {
    path: 'M20.625 8.127q-.55 0-1.025-.205-.475-.205-.832-.563-.358-.357-.563-.832Q18 6.053 18 5.502q0-.54.205-1.02t.563-.837q.357-.358.832-.563.474-.205 1.025-.205.54 0 1.02.205t.837.563q.358.357.563.837.205.48.205 1.02 0 .55-.205 1.025-.205.475-.563.832-.357.358-.837.563-.48.205-1.02.205zm0-3.75q-.469 0-.797.328-.328.328-.328.797 0 .469.328.797.328.328.797.328.469 0 .797-.328.328-.328.328-.797 0-.469-.328-.797-.328-.328-.797-.328zM24 10.002v5.578q0 .774-.293 1.46-.293.685-.803 1.194-.51.51-1.195.803-.686.293-1.459.293-.445 0-.908-.105-.463-.106-.85-.329-.293.95-.855 1.729-.563.78-1.319 1.336-.756.557-1.67.861-.914.305-1.898.305-1.148 0-2.162-.398-1.014-.399-1.805-1.102-.79-.703-1.312-1.664t-.674-2.086h-5.8q-.411 0-.704-.293T0 16.881V6.873q0-.41.293-.703t.703-.293h8.59q-.34-.715-.34-1.5 0-.727.275-1.365.276-.639.75-1.114.475-.474 1.114-.75.638-.275 1.365-.275t1.365.275q.639.276 1.114.75.474.475.75 1.114.275.638.275 1.365t-.275 1.365q-.276.639-.75 1.113-.475.475-1.114.75-.638.276-1.365.276-.188 0-.375-.024-.188-.023-.375-.058v1.078h10.875q.469 0 .797.328.328.328.328.797zM12.75 2.373q-.41 0-.78.158-.368.158-.638.434-.27.275-.428.639-.158.363-.158.773 0 .41.158.78.159.368.428.638.27.27.639.428.369.158.779.158.41 0 .773-.158.364-.159.64-.428.274-.27.433-.639.158-.369.158-.779 0-.41-.158-.773-.159-.364-.434-.64-.275-.275-.639-.433-.363-.158-.773-.158zM6.937 9.814h2.25V7.94H2.814v1.875h2.25v6h1.875zm10.313 7.313v-6.75H12v6.504q0 .41-.293.703t-.703.293H8.309q.152.809.556 1.5.405.691.985 1.19.58.497 1.318.779.738.281 1.582.281.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752zm5.25-1.547v-5.203h-3.75v6.855q.305.305.691.452.387.146.809.146.469 0 .879-.176.41-.175.715-.48.304-.305.48-.715t.176-.879Z',
  },
  discord: {
    path: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  },
};

const TOOLS = [
  {
    name: 'Slack',
    source: '3 unread work messages',
    icon: BRAND_ICONS.slack,
    tone: '#4a154b',
    position: 'left-4 top-8 sm:left-8 sm:top-12',
  },
  {
    name: 'Gmail',
    source: '5 latest emails',
    icon: BRAND_ICONS.gmail,
    tone: '#ea4335',
    position: 'right-4 top-8 sm:right-10 sm:top-12',
  },
  {
    name: 'Trello',
    source: '2 cards moved today',
    icon: BRAND_ICONS.trello,
    tone: '#0052cc',
    position: 'left-5 bottom-20 sm:left-12 sm:bottom-24',
  },
  {
    name: 'Teams',
    source: '2 unanswered messages',
    icon: BRAND_ICONS.teams,
    tone: '#6264a7',
    position: 'right-5 bottom-20 sm:right-12 sm:bottom-24',
  },
  {
    name: 'Discord',
    source: '1 mention in design',
    icon: BRAND_ICONS.discord,
    tone: '#5865f2',
    position: 'left-1/2 top-2 -translate-x-1/2 sm:top-4',
  },
];

const STAGES = [
  {
    label: 'Ready',
    detail: 'Collab is waiting in the desktop widget.',
    transcript: 'Ask about Gmail, Teams, Slack, Trello, or Discord.',
  },
  {
    label: 'Listening',
    detail: 'Voice input is live.',
    transcript: 'Hey Collab, give me the last five emails on Gmail and any unanswered messages on Teams.',
  },
  {
    label: 'Searching',
    detail: 'Collab checks connected tools and ranks what matters.',
    transcript: 'Searching Gmail, Teams, Slack, Trello, and Discord...',
  },
  {
    label: 'Answering',
    detail: 'A short spoken brief and notification list are ready.',
    transcript: 'You have five recent emails, two Teams messages waiting, and one Slack thread that needs a reply.',
  },
];

const RESULTS = [
  { app: 'Gmail', title: '5 latest emails found', detail: 'Two are important. One needs a reply today.', icon: TOOLS[1].icon, tone: '#ea4335' },
  { app: 'Teams', title: '2 unanswered messages', detail: 'Sam asked for the roadmap link. Lina needs the notes.', icon: TOOLS[3].icon, tone: '#6264a7' },
  { app: 'Slack', title: '1 thread should not wait', detail: 'The design channel is waiting on your confirmation.', icon: TOOLS[0].icon, tone: '#4a154b' },
  { app: 'Trello', title: '2 cards changed status', detail: 'A review task moved to blocked this morning.', icon: TOOLS[2].icon, tone: '#0052cc' },
];

const BrandLogo = ({ icon, label, className = 'h-6 w-6' }) => (
  <svg
    className={className}
    role="img"
    viewBox="0 0 24 24"
    aria-label={`${label} logo`}
    focusable="false"
  >
    <path d={icon.path} fill="currentColor" />
  </svg>
);

const Waveform = ({ active }) => (
  <div className="flex h-7 items-center gap-1" aria-hidden="true">
    {[5, 12, 18, 9, 24, 15, 7, 20, 13, 6, 16, 10, 22, 8].map((height, index) => (
      <span
        key={index}
        className={`w-1 rounded-full transition-all duration-500 ${active ? 'animate-pulse bg-primary' : 'bg-muted-foreground/25'}`}
        style={{ height: `${active ? height : Math.max(4, height / 2)}px`, animationDelay: `${index * 70}ms` }}
      />
    ))}
  </div>
);

const ToolNode = ({ tool, active, index }) => (
  <div
    className={`absolute ${tool.position} z-20 flex h-12 w-12 items-center justify-center rounded-2xl border bg-background/95 shadow-lg shadow-black/10 backdrop-blur transition-all duration-700 sm:h-14 sm:w-14 ${
      active ? 'scale-100 border-primary/40 opacity-100' : 'scale-95 border-border/70 opacity-70'
    }`}
    style={{ transitionDelay: `${index * 90}ms` }}
    title={tool.name}
  >
    <span style={{ color: tool.tone }}>
      <BrandLogo icon={tool.icon} label={tool.name} className="h-6 w-6 sm:h-7 sm:w-7" />
    </span>
    {active && (
      <span
        className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background"
        style={{ backgroundColor: tool.tone }}
      />
    )}
  </div>
);

const ResultItem = ({ item, visible, index }) => (
  <div
    className={`flex items-start gap-2.5 rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm transition-all duration-500 ${
      visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
    }`}
    style={{ transitionDelay: `${index * 110}ms` }}
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card">
      <span style={{ color: item.tone }}>
        <BrandLogo icon={item.icon} label={item.app} className="h-[18px] w-[18px]" />
      </span>
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] font-semibold text-foreground">{item.title}</p>
        {visible && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />}
      </div>
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{item.detail}</p>
    </div>
  </div>
);

export const DesktopAssistantShowcase = () => {
  const [stage, setStage] = useState(0);
  const isSearching = stage === 2;
  const isListening = stage === 1;
  const hasAnswer = stage === 3;
  const toolsActive = stage >= 2;

  useEffect(() => {
    const timer = setInterval(() => setStage((current) => (current + 1) % STAGES.length), 3300);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-border/70 bg-background/70 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">Collab desktop assistant</span>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Voice
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-[430px] overflow-hidden border-b border-border/70 bg-background/45 p-4 sm:min-h-[500px] sm:p-6 lg:border-b-0 lg:border-r">
          <div className="absolute inset-x-8 top-24 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="absolute inset-x-8 bottom-32 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="absolute inset-y-16 left-1/2 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

          {TOOLS.map((tool, index) => (
            <ToolNode key={tool.name} tool={tool} active={toolsActive} index={index} />
          ))}

          {toolsActive && (
            <>
              <span className="absolute left-[18%] top-[32%] h-2 w-2 animate-ping rounded-full bg-primary/70 [animation-duration:1.9s]" />
              <span className="absolute right-[21%] top-[40%] h-2 w-2 animate-ping rounded-full bg-primary/70 [animation-delay:250ms] [animation-duration:1.9s]" />
              <span className="absolute bottom-[31%] left-[28%] h-2 w-2 animate-ping rounded-full bg-primary/70 [animation-delay:450ms] [animation-duration:1.9s]" />
            </>
          )}

          <div className="absolute left-1/2 top-1/2 z-30 flex w-[min(78vw,280px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[28px] border border-primary/35 bg-card/95 p-5 text-center shadow-2xl shadow-primary/15 backdrop-blur-md sm:w-80 sm:p-6">
            <span className={`absolute -inset-2 rounded-[34px] border border-primary/20 ${isListening || isSearching ? 'animate-pulse' : ''}`} />
            {isListening && <span className="absolute -inset-4 rounded-[40px] border border-primary/10 animate-ping [animation-duration:1.8s]" />}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              {isListening ? <Mic className="h-6 w-6 animate-pulse" /> : isSearching ? <Search className="h-6 w-6 animate-pulse" /> : <FolderKanban className="h-6 w-6" />}
            </span>
            <div className="relative mt-3 flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Collab</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">{STAGES[stage].label}</span>
            </div>
            <p className="relative mt-2 max-w-[230px] text-[11px] leading-relaxed text-muted-foreground">{STAGES[stage].detail}</p>
            <div className="relative mt-4 flex items-center gap-3 rounded-full border border-border/70 bg-background px-3 py-2">
              {isSearching ? <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> : hasAnswer ? <Volume2 className="h-4 w-4 text-primary" /> : <AudioLines className={`h-4 w-4 ${isListening ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />}
              <Waveform active={isListening || isSearching || hasAnswer} />
            </div>
          </div>
        </div>

        <div className="flex min-h-[430px] flex-col bg-card p-4 sm:min-h-[500px] sm:p-6">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Voice request</p>
              <span className="font-numeric text-[10px] text-muted-foreground">
                {isListening ? '00:07' : isSearching ? 'working' : hasAnswer ? 'spoken' : 'standby'}
              </span>
            </div>
            <p
              key={stage}
              className="min-h-[58px] animate-in fade-in slide-in-from-bottom-1 text-sm font-medium leading-relaxed text-foreground duration-500"
            >
              {STAGES[stage].transcript}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${isListening ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-muted text-muted-foreground'}`}>
                <Mic className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 rounded-full bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                {isListening ? 'Listening with a soft delay...' : hasAnswer ? 'Collab is speaking the brief.' : 'Press the mic and ask naturally.'}
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1 rounded-2xl border border-border/70 bg-background/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Notification brief</p>
              <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${hasAnswer ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                {hasAnswer ? 'Ready' : 'Building'}
              </span>
            </div>
            <div className="space-y-2.5">
              {RESULTS.map((item, index) => (
                <ResultItem key={item.app} item={item} visible={hasAnswer || (isSearching && index < 2)} index={index} />
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">One ask becomes a clean action list.</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Collab can answer aloud, keep the summary in the widget, and turn important results into reminders or tasks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopAssistantShowcase;
