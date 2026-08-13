import { createElement, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  Flame,
  HeartHandshake,
  LockKeyhole,
  Medal,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CircularProgress } from '../components/shared/CircularProgress';
import Avatar from '../components/shared/Avatar';
import CreateCircleDialog from '../components/circles/CreateCircleDialog';
import ManageCircleDialog from '../components/circles/ManageCircleDialog';
import circleService from '../services/circleService';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

const Metric = ({ label, value, detail, icon, color }) => (
  <div className="min-w-0 border-l border-border/60 px-4 first:border-l-0 first:pl-0 sm:px-5">
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      {createElement(icon, { className: `h-3.5 w-3.5 ${color}` })}
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-2 font-numeric text-xl font-bold text-foreground sm:text-2xl">{value}</p>
    <p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p>
  </div>
);

const recognitionMeta = {
  consistent: { icon: Flame, color: 'text-primary', surface: 'bg-primary/10' },
  teammate: { icon: UsersRound, color: 'text-[hsl(var(--chart-3))]', surface: 'bg-[hsl(var(--chart-3))]/10' },
  comeback: { icon: RotateCcw, color: 'text-[hsl(var(--chart-1))]', surface: 'bg-[hsl(var(--chart-1))]/10' },
  helpful: { icon: HeartHandshake, color: 'text-[hsl(var(--chart-4))]', surface: 'bg-[hsl(var(--chart-4))]/10' },
  finisher: { icon: Flag, color: 'text-[hsl(var(--chart-2))]', surface: 'bg-[hsl(var(--chart-2))]/10' },
};

const recognitionTitles = [
  ['consistent', 'Most consistent'],
  ['teammate', 'Best teammate'],
  ['comeback', 'Biggest comeback'],
  ['helpful', 'Most helpful'],
  ['finisher', 'Strongest finisher'],
];

const badgeMeta = {
  'founding-circle': { icon: Sparkles, color: 'text-primary', surface: 'bg-primary/10' },
  'full-circle': { icon: UsersRound, color: 'text-[hsl(var(--chart-3))]', surface: 'bg-[hsl(var(--chart-3))]/10' },
  'focus-pact': { icon: Target, color: 'text-[hsl(var(--chart-1))]', surface: 'bg-[hsl(var(--chart-1))]/10' },
  'finish-line': { icon: Flag, color: 'text-[hsl(var(--chart-2))]', surface: 'bg-[hsl(var(--chart-2))]/10' },
  'learning-loop': { icon: HeartHandshake, color: 'text-[hsl(var(--chart-4))]', surface: 'bg-[hsl(var(--chart-4))]/10' },
  'momentum-70': { icon: Medal, color: 'text-primary', surface: 'bg-primary/10' },
};

const getFallbackRecognitions = () => recognitionTitles.map(([key, title]) => ({
  key,
  title,
  unlocked: false,
  reason: "Waiting for this week's shared signal.",
}));

const getFallbackBadges = (circle) => [
  { key: 'founding-circle', name: 'Founding Circle', description: 'Created a trusted space in Collab.', earned: true, progress: 1, goal: 1 },
  { key: 'full-circle', name: 'Full Circle', description: 'Bring three trusted people into the rhythm.', earned: circle.activeMemberCount >= 3, progress: Math.min(circle.activeMemberCount, 3), goal: 3 },
  { key: 'focus-pact', name: 'Focus Pact', description: 'Protect two collective focus hours in one week.', earned: circle.focusMinutesThisWeek >= 120, progress: Math.min(circle.focusMinutesThisWeek, 120), goal: 120 },
  { key: 'finish-line', name: 'Finish Line', description: 'Complete five commitments together in one week.', earned: circle.completedTasksThisWeek >= 5, progress: Math.min(circle.completedTasksThisWeek, 5), goal: 5 },
  { key: 'learning-loop', name: 'Learning Loop', description: 'Complete five review sessions in one week.', earned: circle.quizAttemptsThisWeek >= 5, progress: Math.min(circle.quizAttemptsThisWeek, 5), goal: 5 },
  { key: 'momentum-70', name: 'Momentum 70', description: 'Reach 70% collective momentum in one week.', earned: circle.collectiveMomentum >= 70, progress: Math.min(circle.collectiveMomentum, 70), goal: 70 },
];

const TeamPulse = ({ circle }) => {
  const memberGoal = Math.max(circle.activeMemberCount, 1) * 5;
  const signals = [
    { label: 'Focus pact', value: formatMinutes(circle.focusMinutesThisWeek), progress: Math.min(100, Math.round((circle.focusMinutesThisWeek / 120) * 100)), color: 'bg-primary' },
    { label: 'Commitments finished', value: circle.completedTasksThisWeek, progress: Math.min(100, Math.round((circle.completedTasksThisWeek / 5) * 100)), color: 'bg-[hsl(var(--chart-3))]' },
    { label: 'Active-day rhythm', value: circle.activeDaysThisWeek, progress: Math.min(100, Math.round((circle.activeDaysThisWeek / memberGoal) * 100)), color: 'bg-[hsl(var(--chart-1))]' },
    { label: 'Review loop', value: circle.quizAttemptsThisWeek, progress: Math.min(100, Math.round((circle.quizAttemptsThisWeek / 5) * 100)), color: 'bg-[hsl(var(--chart-4))]' },
  ];

  return (
    <Card className="border-border/80 bg-card shadow-ios-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-header">Team pulse</p>
            <p className="mt-1 text-sm text-muted-foreground">Collective progress toward a healthy week.</p>
          </div>
          <Badge variant="outline" className="shrink-0">This week</Badge>
        </div>
        <div className="mt-7 space-y-5">
          {signals.map((signal) => (
            <div key={signal.label}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-foreground">{signal.label}</span>
                <span className="font-numeric text-xs font-semibold text-muted-foreground">{signal.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-[width] duration-700 ${signal.color}`} style={{ width: `${signal.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-7 border-t border-border/60 pt-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {circle.collectiveMomentum >= 70
                ? 'Your Circle is protecting a strong, balanced rhythm. Keep finishing what you start.'
                : circle.collectiveMomentum >= 35
                  ? 'Momentum is building. One more shared win can move the whole Circle forward.'
                  : 'Start small together: one focus room and one finished commitment can restart the week.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WeeklyRecognitions = ({ recognitions }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-header">Weekly recognitions</p>
          <p className="mt-1 text-sm text-muted-foreground">Meaningful contribution, without an hours leaderboard.</p>
        </div>
        <Award className="h-5 w-5 shrink-0 text-primary" />
      </div>
      <div className="mt-5">
        {recognitions.map((recognition) => {
          const meta = recognitionMeta[recognition.key] || recognitionMeta.consistent;
          return (
            <div key={recognition.key} className="flex min-h-[76px] items-center gap-3 border-b border-border/55 py-3 last:border-b-0">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.surface} ${meta.color}`}>
                {createElement(recognition.unlocked ? meta.icon : LockKeyhole, { className: 'h-4 w-4' })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">{recognition.title}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {recognition.unlocked ? recognition.memberName : 'Still open'}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{recognition.reason}</p>
              </div>
              {recognition.unlocked && <Avatar name={recognition.memberName} avatarUrl={recognition.avatarUrl} size="sm" />}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/55 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--chart-3))]" />
        Resets every Monday. No private apps, task names, or individual hours are shown.
      </div>
    </CardContent>
  </Card>
);

const BadgeCabinet = ({ badges }) => (
  <section>
    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="section-header">Collab badges</p>
        <p className="mt-1 text-sm text-muted-foreground">Shared milestones your Circle earns across the Collab ecosystem.</p>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{badges.filter((badge) => badge.earned).length}/{badges.length} unlocked</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => {
        const meta = badgeMeta[badge.key] || badgeMeta['founding-circle'];
        const progress = Math.min(100, Math.round((badge.progress / badge.goal) * 100));
        return (
          <Card key={badge.key} className={`border-border/80 bg-card shadow-ios-sm transition-colors ${badge.earned ? 'border-primary/25' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${badge.earned ? `${meta.surface} ${meta.color}` : 'bg-muted text-muted-foreground'}`}>
                  {createElement(badge.earned ? meta.icon : LockKeyhole, { className: 'h-5 w-5' })}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{badge.name}</h3>
                    {badge.earned && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-1 min-h-9 text-xs leading-relaxed text-muted-foreground">{badge.description}</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-[width] duration-700 ${badge.earned ? 'bg-primary' : 'bg-muted-foreground/35'}`} style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">{badge.earned ? 'Earned' : `${badge.progress} of ${badge.goal} toward unlock`}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </section>
);

const CircleRoster = ({ members, activeMemberCount, pendingMemberCount }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-header">People</p>
          <p className="mt-1 text-sm text-muted-foreground">{activeMemberCount} active · {pendingMemberCount || 0} invited</p>
        </div>
        <span className="font-numeric text-xl font-bold text-foreground">{activeMemberCount + (pendingMemberCount || 0)}<span className="text-sm font-normal text-muted-foreground">/8</span></span>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
        {members.map((member) => (
          <div key={member.userId} className="flex min-w-0 items-center gap-2.5">
            <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="max-w-40 truncate text-sm font-medium text-foreground">{member.displayName}</p>
              <p className="text-[11px] text-muted-foreground">{member.owner ? 'Owner' : member.status === 'INVITED' ? 'Invitation pending' : 'Circle member'}</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const CircleDashboard = ({ circle, canManage, onManage }) => {
  const averageFocus = circle.activeMemberCount ? Math.round(circle.focusMinutesThisWeek / circle.activeMemberCount) : 0;
  const averageActiveDays = circle.activeMemberCount ? (circle.activeDaysThisWeek / circle.activeMemberCount).toFixed(1) : '0';
  const recognitions = circle.weeklyRecognitions?.length ? circle.weeklyRecognitions : getFallbackRecognitions();
  const badges = circle.ecosystemBadges?.length ? circle.ecosystemBadges : getFallbackBadges(circle);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="overflow-hidden border-border/80 bg-card shadow-ios-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-5 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><UsersRound className="h-6 w-6" /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-foreground">{circle.name}</h2>
                  <Badge variant="outline" className="border-[hsl(var(--chart-3))]/30 bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]"><LockKeyhole className="mr-1 h-3 w-3" />Private</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">A weekly view of what this Circle is moving together.</p>
              </div>
            </div>
            {canManage && <Button variant="outline" size="sm" onClick={onManage}><Settings2 className="mr-2 h-4 w-4" />Manage</Button>}
          </div>
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[145px_minmax(0,1fr)] lg:items-center sm:px-6">
            <div className="flex items-center justify-center lg:border-r lg:border-border/60">
              <CircularProgress percentage={circle.collectiveMomentum} size={116} strokeWidth={8} color="orange">
                <div className="text-center"><p className="font-numeric text-2xl font-bold text-foreground">{circle.collectiveMomentum}%</p><p className="text-[10px] text-muted-foreground">momentum</p></div>
              </CircularProgress>
            </div>
            <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
              <Metric label="Finished" value={circle.completedTasksThisWeek} detail="collective tasks" icon={CheckCircle2} color="text-[hsl(var(--chart-3))]" />
              <Metric label="Focused" value={formatMinutes(circle.focusMinutesThisWeek)} detail={`${formatMinutes(averageFocus)} per member`} icon={Flame} color="text-primary" />
              <Metric label="Consistency" value={averageActiveDays} detail="days per member" icon={Target} color="text-[hsl(var(--chart-1))]" />
              <Metric label="Reviews" value={circle.quizAttemptsThisWeek} detail="collective attempts" icon={Clock3} color="text-[hsl(var(--chart-4))]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <TeamPulse circle={circle} />
        <WeeklyRecognitions recognitions={recognitions} />
      </div>

      <BadgeCabinet badges={badges} />
      <CircleRoster members={circle.members} activeMemberCount={circle.activeMemberCount} pendingMemberCount={circle.pendingMemberCount} />
    </div>
  );
};

export const CirclesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setCircles(await circleService.getMyCircles()); } catch (error) { console.error('Could not load Circles:', error); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const invitations = useMemo(() => circles.filter((circle) => circle.membershipStatus === 'INVITED'), [circles]);
  const activeCircles = useMemo(() => circles.filter((circle) => circle.membershipStatus === 'ACTIVE'), [circles]);
  const selectedCircle = activeCircles.find((circle) => circle.id === selectedCircleId) || activeCircles[0] || null;

  useEffect(() => {
    if (activeCircles.length && !activeCircles.some((circle) => circle.id === selectedCircleId)) setSelectedCircleId(activeCircles[0].id);
  }, [activeCircles, selectedCircleId]);

  const respond = async (circleId, accepted) => {
    setBusyId(circleId);
    try {
      if (accepted) await circleService.acceptInvitation(circleId); else await circleService.declineInvitation(circleId);
      toast({ title: accepted ? 'Welcome to the Circle' : 'Invitation declined' });
      await load();
    } catch (error) {
      toast({ title: 'Could not update invitation', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const updateCircle = (updated, message) => {
    setCircles((current) => current.map((circle) => circle.id === updated.id ? updated : circle));
    toast({ title: message });
  };

  const deleteCircle = (circleId) => {
    setCircles((current) => current.filter((circle) => circle.id !== circleId));
    toast({ title: 'Circle deleted' });
  };

  return (
    <div className="accent-teal w-full px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow-label"><UsersRound className="h-3.5 w-3.5 text-primary" />Private circles</p><h1 className="mt-2 text-3xl font-bold text-foreground">Progress, with people you trust.</h1><p className="mt-2 max-w-2xl text-muted-foreground">Shared momentum, meaningful recognition, and no surveillance-style leaderboard.</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Circle</Button>
      </div>

      {loading ? <div className="h-[520px] animate-pulse rounded-xl border border-border/80 bg-card" /> : (
        <div className="space-y-7">
          {invitations.length > 0 && <section><p className="section-header mb-3"><Clock3 className="h-4 w-4 text-primary" />Circle invitations</p><div className="grid gap-3 md:grid-cols-2">{invitations.map((circle) => <Card key={circle.id} className="border-primary/25 bg-primary/[0.045]"><CardContent className="flex items-center gap-4 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersRound className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-foreground">{circle.name}</p><p className="mt-1 text-sm text-muted-foreground">{circle.ownerName} invited you to join.</p></div><div className="flex gap-2"><Button size="icon" title="Accept" disabled={busyId === circle.id} onClick={() => respond(circle.id, true)}><Check className="h-4 w-4" /></Button><Button size="icon" title="Decline" variant="outline" disabled={busyId === circle.id} onClick={() => respond(circle.id, false)}><X className="h-4 w-4" /></Button></div></CardContent></Card>)}</div></section>}

          {activeCircles.length ? <><div className="flex gap-2 overflow-x-auto pb-1">{activeCircles.map((circle) => <button key={circle.id} type="button" onClick={() => setSelectedCircleId(circle.id)} className={`shrink-0 rounded-lg border px-4 py-2.5 text-left transition-all ${selectedCircle?.id === circle.id ? 'border-primary/35 bg-primary/10 text-foreground shadow-ios-sm' : 'border-border/70 bg-card text-muted-foreground hover:text-foreground'}`}><span className="block text-sm font-medium">{circle.name}</span><span className="mt-0.5 block text-[11px]">{circle.collectiveMomentum}% momentum · {circle.activeMemberCount} {circle.activeMemberCount === 1 ? 'person' : 'people'}</span></button>)}</div>{selectedCircle && <CircleDashboard circle={selectedCircle} canManage={selectedCircle.ownerId === user?.id} onManage={() => setManageOpen(true)} />}</> : <div className="rounded-xl border-2 border-dashed border-border/70 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold text-foreground">Progress feels lighter with people around you.</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create a small private Circle and invite friends who want to keep their own promises, together.</p><Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create your first Circle</Button></div>}
        </div>
      )}

      <CreateCircleDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(circle) => { setCircles((current) => [circle, ...current]); setSelectedCircleId(circle.id); setCreateOpen(false); toast({ title: 'Circle created', description: 'Your private progress space is ready.' }); }} />
      <ManageCircleDialog circle={selectedCircle} open={manageOpen} onOpenChange={setManageOpen} onUpdated={updateCircle} onDeleted={deleteCircle} />
    </div>
  );
};

export default CirclesPage;
