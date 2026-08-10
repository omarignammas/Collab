import { createElement } from 'react';
import {
  Activity,
  AppWindow,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  Clock3,
  EyeOff,
  MonitorCog,
  Pause,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
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

const ActivityCell = ({ day, maximum }) => {
  const intensity = day.seconds ? Math.max(0.2, day.seconds / maximum) : 0;
  return (
    <span
      className="group relative aspect-square min-h-2.5 rounded-[3px] bg-muted"
      style={day.seconds ? { backgroundColor: `hsl(var(--primary) / ${0.18 + (intensity * 0.82)})` } : undefined}
    >
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-ios-sm group-hover:block">
        {new Date(`${day.day}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {formatTrackedTime(day.seconds)}
      </span>
    </span>
  );
};

const FocusHeatmap = ({ days }) => {
  const maximum = Math.max(...days.map((day) => day.seconds), 1);
  return (
    <div>
      <div className="mb-2 flex justify-between pl-7 text-[10px] font-medium uppercase text-muted-foreground">
        <span>8 weeks ago</span><span>This week</span>
      </div>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-1 text-[9px] leading-[10px] text-muted-foreground">
          <span>M</span><span /><span>W</span><span /><span>F</span><span /><span>S</span>
        </div>
        <div className="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-1">
          {days.map((day) => <ActivityCell key={day.day} day={day} maximum={maximum} />)}
        </div>
      </div>
    </div>
  );
};

const EmptyInsights = ({ available, onEnable }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><MonitorCog className="h-6 w-6" /></span>
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

const SummaryMetric = ({ icon, label, value, detail, accent }) => (
  <div className="min-w-0 px-5 py-5 first:pl-0 last:pr-0 lg:border-l lg:border-border/70 lg:first:border-l-0">
    <div className="flex items-center gap-2 text-muted-foreground">{createElement(icon, { className: `h-4 w-4 ${accent}` })}<span className="text-xs font-medium">{label}</span></div>
    <p className="mt-2 truncate font-numeric text-2xl font-semibold text-foreground">{value}</p>
    <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
  </div>
);

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

const getPerformanceSignals = (summary, communication) => [
  { label: 'Focus', value: clampScore(summary.intentionalWeekRate), detail: 'Intentional time' },
  { label: 'Consistency', value: clampScore(summary.consistencyRate), detail: 'Active-day rhythm' },
  { label: 'Endurance', value: clampScore((summary.averageActiveDaySeconds / (4 * 60 * 60)) * 100), detail: 'Relative to a 4h day' },
  {
    label: 'Momentum',
    value: summary.weeklyChangePercent === null
      ? (summary.weeklySeconds ? 50 : 0)
      : clampScore(50 + (summary.weeklyChangePercent / 2)),
    detail: 'Week-over-week pace',
  },
  { label: 'Balance', value: summary.topApps[0] ? clampScore(100 - summary.topApps[0].percentage) : 0, detail: 'Attention spread' },
  { label: 'Collaboration', value: clampScore(communication), detail: 'Communication share' },
];

const PerformanceRadar = ({ signals }) => {
  const center = 165;
  const radius = 101;
  const labelRadius = 139;
  const pointAt = (index, value = 100, distance = radius) => {
    const angle = ((index * 360) / signals.length - 90) * (Math.PI / 180);
    const scaledDistance = distance * (value / 100);
    return {
      x: center + (Math.cos(angle) * scaledDistance),
      y: center + (Math.sin(angle) * scaledDistance),
    };
  };
  const polygonPoints = (level) => signals
    .map((_, index) => {
      const point = pointAt(index, level);
      return `${point.x},${point.y}`;
    })
    .join(' ');
  const signalPoints = signals
    .map((signal, index) => {
      const point = pointAt(index, signal.value);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <svg
      className="mx-auto h-auto w-full max-w-[350px] overflow-visible"
      viewBox="0 0 330 330"
      role="img"
      aria-label={`Seven-day performance profile: ${signals.map((signal) => `${signal.label} ${signal.value}`).join(', ')}`}
    >
      {[25, 50, 75, 100].map((level) => (
        <polygon key={level} points={polygonPoints(level)} className="fill-transparent stroke-border/80" strokeWidth="1" />
      ))}
      {signals.map((signal, index) => {
        const edge = pointAt(index);
        const label = pointAt(index, 100, labelRadius);
        const anchor = label.x < center - 10 ? 'end' : label.x > center + 10 ? 'start' : 'middle';
        return (
          <g key={signal.label}>
            <line x1={center} y1={center} x2={edge.x} y2={edge.y} className="stroke-border/70" strokeWidth="1" />
            <text x={label.x} y={label.y - 5} textAnchor={anchor} className="fill-muted-foreground text-[10px] font-medium">
              <tspan x={label.x}>{signal.label}</tspan>
              <tspan x={label.x} dy="14" className="fill-foreground font-numeric text-[11px] font-semibold">{signal.value}</tspan>
            </text>
          </g>
        );
      })}
      <polygon points={signalPoints} className="fill-primary/15 stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      {signals.map((signal, index) => {
        const point = pointAt(index, signal.value);
        return <circle key={signal.label} cx={point.x} cy={point.y} r="3.5" className="fill-card stroke-primary" strokeWidth="2.5" />;
      })}
      <circle cx={center} cy={center} r="3" className="fill-primary" />
    </svg>
  );
};

const AppLogo = ({ app, large = false }) => (
  <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted shadow-ios-sm ${large ? 'h-16 w-16' : 'h-9 w-9'}`}>
    {app?.iconDataUrl
      ? <img src={app.iconDataUrl} alt="" className="h-full w-full object-contain" />
      : <AppWindow className={`${large ? 'h-7 w-7' : 'h-4 w-4'} text-muted-foreground`} />}
  </span>
);

const TopAppRow = ({ app }) => (
  <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(72px,130px)_42px] items-center gap-3 py-3">
    <AppLogo app={app} />
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground">{app.name}</p>
      <p className="truncate text-[11px] text-muted-foreground">{app.category} · {formatTrackedTime(app.seconds)}</p>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${CATEGORY_STYLES[app.category] || CATEGORY_STYLES.Other}`} style={{ width: `${app.percentage}%` }} />
    </div>
    <span className="text-right font-numeric text-xs font-semibold text-foreground">{app.percentage}%</span>
  </div>
);

export const InsightsPage = () => {
  const { available, enabled, setTracking, currentApp, summary } = useActivityTracking();
  const topApp = summary.topApps[0];
  const communication = summary.categories.find((category) => category.name === 'Communication')?.percentage || 0;
  const performanceSignals = getPerformanceSignals(summary, communication);
  const change = summary.weeklyChangePercent;
  const strongestDayLabel = summary.strongestDay?.seconds
    ? new Date(`${summary.strongestDay.day}T12:00:00`).toLocaleDateString([], { weekday: 'long' })
    : 'Not yet';
  const insight = summary.activeDays >= 5
    ? `You showed up on ${summary.activeDays} days this week. Protect that rhythm before adding more hours.`
    : summary.intentionalWeekRate >= 60
      ? `${summary.intentionalWeekRate}% of tracked time was intentional work. Your attention is landing in the right places.`
      : topApp
        ? `${topApp.name} led your week at ${topApp.percentage}% of tracked time. Check whether that matches your priority.`
        : 'A useful pattern will appear here once Collab has observed a little desktop time.';

  return (
    <div className="accent-amber w-full px-4 py-7 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow-label"><BarChart3 className="h-3.5 w-3.5 text-primary" />Desktop insights</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Work rhythm</h1>
          <p className="mt-1 text-sm text-muted-foreground">Useful signals from activity stored only on this Mac.</p>
        </div>
        {enabled && (
          <div className="flex max-w-full items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-xs shadow-ios-sm">
            <span className="relative flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--status-done-fg))] opacity-40" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--status-done-fg))]" /></span>
            <span className="text-muted-foreground">Now</span>
            <span className="truncate font-medium text-foreground">{currentApp?.name || 'Waiting for another app'}</span>
          </div>
        )}
      </header>

      {!enabled ? <EmptyInsights available={available} onEnable={() => setTracking(true)} /> : (
        <div className="space-y-5">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="section-header">Focus</p><p className="mt-1 text-xs text-muted-foreground">Last 7 days</p></div>
                  {change !== null && (
                    <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${change >= 0 ? 'bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))]' : 'bg-destructive/10 text-destructive'}`}>
                      {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(change)}% vs previous week
                    </span>
                  )}
                </div>
                <div className="mt-5 grid gap-6 md:grid-cols-[170px_minmax(0,1fr)] md:items-end">
                  <div><p className="font-numeric text-4xl font-semibold text-foreground">{formatTrackedTime(summary.weeklySeconds)}</p><p className="mt-1 text-sm text-muted-foreground">tracked this week</p><div className="mt-5 border-t border-border/70 pt-4"><p className="font-numeric text-lg font-semibold text-foreground">{summary.intentionalWeekRate}%</p><p className="text-xs text-muted-foreground">intentional work</p></div></div>
                  <FocusHeatmap days={summary.heatmapDays} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between"><div><p className="section-header">Performance profile</p><p className="mt-1 text-xs text-muted-foreground">Seven-day behavior signals</p></div><Activity className="h-5 w-5 text-primary" /></div>
                <div className="mt-1">
                  <PerformanceRadar signals={performanceSignals} />
                </div>
                <p className="-mt-2 text-center text-[10px] text-muted-foreground">Relative signals from local activity, not a productivity grade.</p>
                <div className="mt-4 border-t border-border/70 pt-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Collab insight</p><p className="mt-2 text-sm leading-relaxed text-foreground">{insight}</p></div>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-2 border-y border-border/70 lg:grid-cols-4">
            <SummaryMetric icon={Clock3} label="Today" value={formatTrackedTime(summary.todaySeconds)} detail="tracked time" accent="text-primary" />
            <SummaryMetric icon={CalendarDays} label="Active days" value={`${summary.activeDays}/7`} detail={`${summary.consistencyRate}% consistency`} accent="text-[hsl(var(--chart-2))]" />
            <SummaryMetric icon={Target} label="Average active day" value={formatTrackedTime(summary.averageActiveDaySeconds)} detail="on days you worked" accent="text-[hsl(var(--chart-3))]" />
            <SummaryMetric icon={Sparkles} label="Strongest day" value={strongestDayLabel} detail={formatTrackedTime(summary.strongestDay?.seconds)} accent="text-[hsl(var(--chart-4))]" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(310px,.85fr)]">
            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between"><div><p className="section-header">Top apps</p><p className="mt-1 text-xs text-muted-foreground">Share of tracked time this week</p></div><AppWindow className="h-5 w-5 text-primary" /></div>
                {topApp ? (
                  <div className="mt-5 grid gap-5 md:grid-cols-[190px_minmax(0,1fr)]">
                    <div className="flex min-w-0 flex-col justify-center border-b border-border/70 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-5">
                      <AppLogo app={topApp} large />
                      <p className="mt-4 truncate text-xl font-semibold text-foreground">{topApp.name}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase text-muted-foreground">Most used app</p>
                      <p className="mt-4 font-numeric text-3xl font-semibold text-primary">{topApp.percentage}%</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatTrackedTime(topApp.seconds)} of your week</p>
                    </div>
                    <div className="min-w-0 divide-y divide-border/60">
                      {summary.topApps.slice(1).length
                        ? summary.topApps.slice(1).map((app) => <TopAppRow key={app.key} app={app} />)
                        : <div className="flex min-h-32 items-center justify-center text-center text-sm text-muted-foreground">More app activity will appear here as your week develops.</div>}
                    </div>
                  </div>
                ) : <p className="py-10 text-center text-sm text-muted-foreground">Your app distribution will appear after a little desktop time.</p>}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between"><div><p className="section-header">Attention mix</p><p className="mt-1 text-xs text-muted-foreground">Grouped by useful work categories</p></div><Brain className="h-5 w-5 text-[hsl(var(--chart-1))]" /></div>
                <div className="mt-5 space-y-4">
                  {summary.categories.length ? summary.categories.map((category) => (
                    <div key={category.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm text-foreground"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_STYLES[category.name] || CATEGORY_STYLES.Other}`} /><span className="truncate">{category.name}</span></span>
                      <span className="font-numeric text-xs text-muted-foreground">{formatTrackedTime(category.seconds)} · {category.percentage}%</span>
                      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${CATEGORY_STYLES[category.name] || CATEGORY_STYLES.Other}`} style={{ width: `${category.percentage}%` }} /></div>
                    </div>
                  )) : <p className="py-10 text-center text-sm text-muted-foreground">No category activity yet.</p>}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-4 border-t border-border/70 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))]"><EyeOff className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-foreground">Private by design</p><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Only app names, public icons, and durations are stored locally. No tabs, URLs, window titles, typing, files, screenshots, or message content.</p></div></div>
            <Button className="shrink-0" variant="outline" size="sm" onClick={() => setTracking(false)}><Pause className="mr-2 h-3.5 w-3.5" />Pause tracking</Button>
          </section>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
