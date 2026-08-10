import { AppWindow, BarChart3, Brain, Clock3, EyeOff, MonitorCog, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useActivityTracking } from '../context/ActivityTrackingContext';
import { formatTrackedTime } from '../services/activityTracking';

const CATEGORY_STYLES = {
  'Deep work': 'bg-primary',
  Writing: 'bg-[hsl(var(--chart-1))]',
  Design: 'bg-[hsl(var(--chart-2))]',
  Communication: 'bg-[hsl(var(--chart-3))]',
  Research: 'bg-[hsl(var(--chart-4))]',
  Other: 'bg-muted-foreground',
};

const StatCard = ({ icon: Icon, label, value, hint, color = 'text-primary' }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="p-5">
      <Icon className={`h-5 w-5 ${color}`} />
      <p className="mt-5 font-numeric text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </CardContent>
  </Card>
);

const EmptyInsights = ({ available, onEnable }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><MonitorCog className="h-6 w-6" /></span>
      <h2 className="mt-5 text-xl font-semibold text-foreground">Your work rhythm starts here.</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {available
          ? 'Turn on local desktop tracking to see time by app and work category. Collab never reads window titles, browser pages, files, or messages.'
          : 'Open Collab desktop on your Mac to enable local activity tracking. The web app never tracks your computer activity.'}
      </p>
      {available && <Button className="mt-6" onClick={onEnable}><ShieldCheck className="mr-2 h-4 w-4" />Enable local tracking</Button>}
    </CardContent>
  </Card>
);

export const InsightsPage = () => {
  const { available, enabled, setTracking, currentApp, summary } = useActivityTracking();
  const maxDaySeconds = Math.max(...summary.days.map((day) => day.seconds), 1);
  const topApp = summary.topApps[0];
  const currentStatus = currentApp?.category || 'Waiting for a work app';

  return (
    <div className="accent-amber w-full px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow-label"><BarChart3 className="h-3.5 w-3.5 text-primary" />Desktop insights</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Your work, in context.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">A private picture of how you spend your attention, built from app categories rather than screen surveillance.</p>
        </div>
        {enabled && <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-xs shadow-ios-sm"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--status-done-fg))] opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--status-done-fg))]" /></span><span className="text-muted-foreground">Now</span><span className="font-medium text-foreground">{currentStatus}{currentApp?.name ? ` · ${currentApp.name}` : ''}</span></div>}
      </div>

      {!enabled ? <EmptyInsights available={available} onEnable={() => setTracking(true)} /> : (
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Clock3} label="Tracked today" value={formatTrackedTime(summary.todaySeconds)} hint="Only while Collab desktop is running." />
            <StatCard icon={Brain} label="Intentional work" value={`${summary.focusRate}%`} hint="Deep work, writing, and design as a share of today." color="text-[hsl(var(--chart-1))]" />
            <StatCard icon={AppWindow} label="Top app" value={topApp?.name || '—'} hint={topApp ? `${formatTrackedTime(topApp.seconds)} in the last 7 days.` : 'Your most-used work app will appear here.'} color="text-[hsl(var(--chart-3))]" />
            <StatCard icon={Sparkles} label="Focus signal" value={currentApp?.category || 'Ready'} hint="This can be shared as a broad status in a Focus Room." color="text-[hsl(var(--chart-4))]" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4"><div><p className="section-header">Focus rhythm</p><p className="mt-1 text-sm text-muted-foreground">Last 14 days of locally tracked time.</p></div><span className="text-xs text-muted-foreground">local only</span></div>
                <div className="mt-8 flex h-44 items-end gap-2 sm:gap-3">
                  {summary.days.map((day) => {
                    const height = day.seconds ? Math.max(8, Math.round((day.seconds / maxDaySeconds) * 100)) : 4;
                    return <div key={day.day} className="group flex min-w-0 flex-1 flex-col items-center gap-2"><div className="relative flex h-32 w-full items-end"><div style={{ height: `${height}%` }} className="w-full rounded-md bg-primary/80 transition-all duration-300 group-hover:bg-primary" /><div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-ios-sm transition-opacity group-hover:opacity-100">{formatTrackedTime(day.seconds)}</div></div><span className="text-[10px] text-muted-foreground">{new Date(`${day.day}T12:00:00`).toLocaleDateString([], { weekday: 'narrow' })}</span></div>;
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="p-6"><p className="section-header">Where your time went</p><p className="mt-1 text-sm text-muted-foreground">Last 7 days, grouped into useful categories.</p>
                <div className="mt-6 space-y-4">{summary.categories.length ? summary.categories.map((category) => {
                  const share = summary.categories.reduce((sum, item) => sum + item.seconds, 0);
                  const percent = share ? Math.round((category.seconds / share) * 100) : 0;
                  return <div key={category.name}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-foreground"><span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_STYLES[category.name] || CATEGORY_STYLES.Other}`} />{category.name}</span><span className="font-numeric text-muted-foreground">{formatTrackedTime(category.seconds)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${CATEGORY_STYLES[category.name] || CATEGORY_STYLES.Other}`} style={{ width: `${percent}%` }} /></div></div>;
                }) : <p className="py-8 text-center text-sm text-muted-foreground">Your category breakdown will appear after a little desktop time.</p>}</div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="border-border/80 bg-card shadow-ios-sm"><CardContent className="p-6"><p className="section-header">Top apps</p><p className="mt-1 text-sm text-muted-foreground">What supported your work over the last week.</p><div className="mt-5 divide-y divide-border/60">{summary.topApps.length ? summary.topApps.map((app, index) => <div key={app.key} className="flex items-center gap-3 py-3"><span className="font-numeric text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span><span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_STYLES[app.category] || CATEGORY_STYLES.Other}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{app.name}</p><p className="text-xs text-muted-foreground">{app.category}</p></div><span className="font-numeric text-sm text-muted-foreground">{formatTrackedTime(app.seconds)}</span></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No tracked apps yet.</p>}</div></CardContent></Card>
            <Card className="border-border/80 bg-card shadow-ios-sm"><CardContent className="p-6"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))]"><EyeOff className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-semibold text-foreground">Private by design</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Collab stores app names and durations only on this device. It does not capture tabs, websites, window titles, typing, files, screenshots, or message content.</p><Button className="mt-5" variant="outline" onClick={() => setTracking(false)}>Pause tracking</Button></CardContent></Card>
          </section>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
