import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  ArrowRight,
  Layers,
  Map,
  Flame,
  CheckCircle2,
  Home,
  ListTodo,
  LayoutGrid,
  CalendarDays,
  BarChart3,
  Menu,
  X,
  Sparkles,
  Timer,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { Reveal } from '../components/shared/Reveal';
import ScreensShowcase from '../components/landing/ScreensShowcase';
import CollaborateShowcase from '../components/landing/CollaborateShowcase';
import AiReportShowcase from '../components/landing/AiReportShowcase';
import SummaryQuizShowcase from '../components/landing/SummaryQuizShowcase';
import StepsTimeline from '../components/landing/StepsTimeline';
import RotatingWord from '../components/landing/RotatingWord';
import { AiChatAnimation, NotesAnimation, TasksBoardAnimation, RoadmapAnimation } from '../components/landing/FeatureAnimations';
import HeroNotifications from '../components/landing/HeroNotifications';
import { ModeToggle } from '../components/ui/mode-toggle';

const NAV_LINKS = [
  { href: '#screens', label: 'Screens' },
  { href: '#collaborate', label: 'Collaborate' },
  { href: '#ai-reports', label: 'AI' },
  { href: '#workspace', label: 'Workspace' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'Process' },
];

// Kept to close-to-identical character length on purpose — the rotating swiper swaps
// these in place, and same-length words mean the swap never looks lopsided mid-transition.
const HERO_AUDIENCE_WORDS = ['study groups', 'class cohorts', 'bootcamp crews', 'founder teams'];
const WORKSPACE_WORDS = ['your terms', 'your rules', 'your speed', 'your plans'];

const HERO_CAPABILITIES = [
  { icon: Sparkles, label: 'AI-assisted chat & summaries' },
  { icon: Timer, label: 'Live focus rooms' },
  { icon: Flame, label: 'Auto-tracked streaks' },
  { icon: Layers, label: 'Shared session notes' },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Collab, right in the chat',
    description: 'Just ask, or say "collab" in any room chat, and get an instant answer — from a quick explanation to curated links, no tab-switching.',
    Anim: AiChatAnimation,
  },
  {
    icon: Layers,
    title: 'Notes everyone builds on',
    description: 'Session notes group themselves by topic as your group adds to them — one shared thread, not scattered messages.',
    Anim: NotesAnimation,
  },
  {
    icon: ListTodo,
    title: 'Tasks that track themselves',
    description: 'Check something off and its status, board column, and course progress all update on their own — nothing to sync by hand.',
    Anim: TasksBoardAnimation,
  },
  {
    icon: Map,
    title: 'AI-planned roadmaps',
    description: 'Upload a brief or describe the project — AI drafts a full task breakdown with dates and priorities, ready to review.',
    Anim: RoadmapAnimation,
  },
];

const AREAS = [
  { tag: 'MAIN', module: 'Dashboard', icon: Home, focus: 'Today, this week, by priority' },
  { tag: 'MAIN', module: 'Tasks', icon: ListTodo, focus: 'List view or drag-and-drop board' },
  { tag: 'PLAN', module: 'Calendar', icon: CalendarDays, focus: 'Every due date, one month at a time' },
  { tag: 'TRACK', module: 'Stats', icon: BarChart3, focus: 'Streaks, trends, completion rate' },
];

const STEPS = [
  {
    number: '01',
    title: 'Upload or describe it',
    description: 'Drop in a syllabus, brief, or reference file — or just describe the project. That\'s the material AI plans from.',
  },
  {
    number: '02',
    title: 'AI drafts the roadmap',
    description: 'Get back a full task breakdown — titles, priorities, types, and due dates — built around your target date.',
  },
  {
    number: '03',
    title: 'Review, then make it real',
    description: 'Edit or remove anything before confirming. Approved tasks land straight in your course, calendar, and team.',
  },
];

export const LandingPage = () => {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav — flush with the page at the top, becomes a floating inset card once scrolled */}
      <div className={`sticky top-0 z-40 transition-[padding] duration-300 ${isScrolled ? 'px-3 pt-3 sm:px-6' : 'px-0 pt-0'}`}>
        <nav
          className={`mx-auto flex items-center justify-between backdrop-blur-md transition-all duration-300 ${
            isScrolled
              ? 'max-w-5xl rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-lg shadow-black/10'
              : 'max-w-none border-b border-border/80 bg-background/90 px-4 py-4 sm:px-6 md:px-10'
          }`}
        >
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <FolderKanban className="h-4 w-4" />
            </span>
            Collab
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ModeToggle />
            {user ? (
              <Button asChild size="sm" variant="outline" className="border-primary/60">
                <Link to="/courses">
                  Enter App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-primary/60">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ModeToggle />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div className="mx-auto mt-2 max-w-5xl animate-in fade-in slide-in-from-top-2 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-lg shadow-black/10 backdrop-blur-md duration-200 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
              {user ? (
                <Button asChild size="sm" variant="outline" className="border-primary/60">
                  <Link to="/courses" onClick={() => setIsMobileMenuOpen(false)}>
                    Enter App
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-primary/60">
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <main>
      {/* Hero */}
      <section className="bg-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob-a absolute -left-40 -top-40 h-[440px] w-[440px] rounded-full bg-[hsl(var(--chart-1)/0.08)] blur-3xl dark:bg-[hsl(var(--chart-1)/0.22)]" />
          <div className="animate-blob-b absolute -right-32 top-0 h-[380px] w-[380px] rounded-full bg-[hsl(var(--chart-2)/0.07)] blur-3xl dark:bg-[hsl(var(--chart-2)/0.18)]" />
          <div className="animate-blob-a absolute -bottom-48 left-1/3 h-[380px] w-[380px] rounded-full bg-[hsl(var(--chart-3)/0.06)] blur-3xl [animation-delay:-8s] dark:bg-[hsl(var(--chart-3)/0.16)]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_65%)]" />

        <HeroNotifications />

        <div className="container relative mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow-label animate-in fade-in slide-in-from-bottom-2 mx-auto mb-6 w-fit duration-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              [ system notice ] status · online
              <span className="animate-blink text-primary">_</span>
            </p>

            <h1 className="animate-in fade-in slide-in-from-bottom-3 text-balance text-4xl font-bold leading-tight text-foreground duration-700 [animation-delay:100ms] [animation-fill-mode:backwards] sm:text-5xl md:text-6xl">
              The coworking layer for{' '}
              <span className="text-neon-blue">
                <RotatingWord words={HERO_AUDIENCE_WORDS} />.
              </span>
            </h1>

            <p className="animate-in fade-in slide-in-from-bottom-3 mx-auto mt-6 max-w-xl text-balance text-sm uppercase tracking-wide text-muted-foreground duration-700 [animation-delay:200ms] [animation-fill-mode:backwards]">
              Not a to-do app for one — wired into your syllabus or your playlist, built to grow together.
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-3 mx-auto mt-8 max-w-lg rounded-lg border border-border/80 bg-card px-5 py-3 duration-700 [animation-delay:300ms] [animation-fill-mode:backwards]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">workflow</span>
                <span className="text-foreground">
                  to do <span className="text-muted-foreground">→</span> in progress{' '}
                  <span className="text-muted-foreground">→</span> <span className="text-primary">done</span>
                </span>
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-3 mt-8 flex flex-col items-center justify-center gap-3 duration-700 [animation-delay:400ms] [animation-fill-mode:backwards] sm:flex-row">
              <Button asChild size="lg" className="w-full transition-transform hover:-translate-y-0.5 sm:w-auto">
                <Link to={user ? '/courses' : '/register'}>
                  {user ? 'Go to Courses' : 'Get Started Free'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="outline" className="w-full transition-transform hover:-translate-y-0.5 sm:w-auto">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-3 mt-8 flex flex-wrap items-center justify-center gap-2 duration-700 [animation-delay:500ms] [animation-fill-mode:backwards]">
              {HERO_CAPABILITIES.map((cap) => (
                <span
                  key={cap.label}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <cap.icon className="h-3.5 w-3.5 text-primary" />
                  {cap.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Screens: tabbed product showcase */}
      <section id="screens" className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal className="mb-10 text-center">
            <p className="eyebrow-label mx-auto mb-4 w-fit">[ the app ]</p>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Every screen, <span className="text-neon-blue">built for the work</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              A quick look around — this is what you'll actually be using.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <ScreensShowcase />
          </Reveal>
        </div>
      </section>

      {/* Collaborate: friends + focus room invites */}
      <section id="collaborate" className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal className="mb-10 text-center">
            <p className="eyebrow-label mx-auto mb-4 w-fit">[ together ]</p>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Bring <span className="text-neon-blue">friends</span> into focus
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Invite a friend to a Focus Room and they get a real-time notification the moment you do.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <CollaborateShowcase />
          </Reveal>
        </div>
      </section>

      {/* AI: sessions and course material, both turned into something useful */}
      <section id="ai-reports" className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal className="mb-10 text-center">
            <p className="eyebrow-label mx-auto mb-4 w-fit">[ ai ]</p>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Your session, <span className="text-neon-blue">summarized for you</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Chat, take notes, focus together, or upload a course file — AI turns any of it into a clean report,
              summary, diagram, or quiz.
            </p>
          </Reveal>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2">
            <Reveal delay={100}>
              <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground lg:text-left">
                Deep Work Sprint
              </p>
              <AiReportShowcase />
            </Reveal>
            <Reveal delay={200}>
              <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground lg:text-left">
                Course Summaries
              </p>
              <SummaryQuizShowcase />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Workspace: terminal mock + area table */}
      <section id="workspace" className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <p className="eyebrow-label mb-4">[ the workspace ]</p>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Real work on <span className="text-neon-blue"><RotatingWord words={WORKSPACE_WORDS} />.</span>
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              A taste of what the dashboard looks like day to day — the rest is in the app.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Reveal delay={100} className="rounded-lg border border-border/80 bg-card p-5 transition-transform hover:-translate-y-1">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3 text-xs">
                <span className="text-muted-foreground">// dashboard.session</span>
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  live
                </span>
              </div>
              <div className="space-y-1.5 text-sm leading-relaxed">
                <p className="text-muted-foreground">$ open collab --today</p>
                <p className="text-muted-foreground">[app] loading today's tasks...</p>
                <p className="text-foreground">[app] 3 due today · 1 overdue</p>
                <p className="text-muted-foreground">→ next up:</p>
                <p className="text-foreground">&nbsp;&nbsp;Lab Report 3 — Organic Chemistry <span className="pill-priority-high rounded px-1.5 py-0.5 text-xs">High</span></p>
              </div>
            </Reveal>

            <Reveal delay={200} className="overflow-hidden rounded-lg border border-border/80 bg-card transition-transform hover:-translate-y-1">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
                <span>module</span>
                <span>focus</span>
              </div>
              {AREAS.map((area) => (
                <div key={area.module} className="grid grid-cols-[auto_1fr] items-center gap-x-4 border-b border-border/60 px-4 py-3 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 text-primary">
                      <area.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{area.module}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{area.focus}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <p className="eyebrow-label mb-4">[ features ]</p>
            <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
              AI that does <span className="text-neon-blue">the busywork</span>
            </h2>
            <p className="mb-14 max-w-xl text-muted-foreground">
              Not a chatbot bolted on the side — it's in the chat, the notes, and the planning, wherever the work already happens.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <Reveal
                key={feature.title}
                delay={i * 100}
                className="group rounded-xl border border-border/80 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                  <feature.icon className="h-5 w-5 transition-transform duration-300 group-hover:rotate-6" />
                </div>
                <feature.Anim />
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <p className="eyebrow-label mb-4">[ process ]</p>
            <h2 className="mb-14 text-3xl font-bold text-foreground sm:text-4xl">
              From a brief to a <span className="text-neon-blue">full roadmap</span>
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <StepsTimeline steps={STEPS} />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/80 py-20">
        <div className="container mx-auto px-4">
          <Reveal className="mx-auto flex max-w-3xl flex-col items-center rounded-2xl border border-border/80 bg-card px-6 py-14 text-center">
            <CheckCircle2 className="mb-4 h-8 w-8 text-primary" />
            <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">
              Start organizing your work today
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Free to use. No credit card, no setup calls — just create a course and go.
            </p>
            <Button asChild size="lg" className="mt-8 transition-transform hover:-translate-y-0.5">
              <Link to={user ? '/courses' : '/register'}>
                {user ? 'Go to Courses' : 'Get Started Free'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="relative flex min-h-[280px] flex-col overflow-hidden border-t border-border bg-background sm:min-h-[320px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
        >
          <span
            className="whitespace-nowrap font-black leading-none tracking-tighter text-foreground/[0.05]"
            style={{ fontSize: 'clamp(5rem, 22vw, 300px)' }}
          >
            COLLAB
          </span>
        </div>

        <div className="container relative mx-auto flex flex-1 flex-col justify-between gap-8 px-4 py-10">
          <a
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-foreground transition-colors hover:bg-accent"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white">
              <FolderKanban className="h-3.5 w-3.5" />
            </span>
            Collab
          </a>

          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Collab. Built for students, not spreadsheets.</p>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="transition-colors hover:text-foreground">Terms of Use</Link>
              <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
