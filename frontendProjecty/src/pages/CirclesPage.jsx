import { createElement, useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock3, Flame, Plus, Settings2, Target, UsersRound, X } from 'lucide-react';
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
  <div className="min-w-0 border-l border-border/60 px-5 first:border-l-0 first:pl-0">
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{createElement(icon, { className: `h-3.5 w-3.5 ${color}` })}{label}</div>
    <p className="mt-2 font-numeric text-2xl font-bold text-foreground">{value}</p>
    <p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p>
  </div>
);

const MemberRow = ({ member, maxScore }) => {
  const momentum = member.momentum;
  const score = momentum?.score || 0;
  const barWidth = maxScore ? Math.max(4, Math.round((score / maxScore) * 100)) : 0;

  return (
    <div className="grid gap-3 border-b border-border/50 py-4 last:border-b-0 sm:grid-cols-[minmax(160px,1fr)_minmax(130px,.8fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="md" />
        <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{member.displayName}{member.owner && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· owner</span>}</p><p className="mt-0.5 text-xs text-muted-foreground">{momentum?.activeDays || 0} active days · {formatMinutes(momentum?.focusMinutes || 0)} focused</p></div>
      </div>
      <div><div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Momentum</span><span className="font-numeric font-semibold text-foreground">{score}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${barWidth}%` }} /></div></div>
      <div className="flex gap-4 text-right text-xs"><div><b className="font-numeric text-foreground">{momentum?.completedTasks || 0}</b><span className="ml-1 text-muted-foreground">tasks</span></div><div><b className="font-numeric text-foreground">{momentum?.quizAttempts || 0}</b><span className="ml-1 text-muted-foreground">reviews</span></div></div>
    </div>
  );
};

const CircleDashboard = ({ circle, canManage, onManage }) => {
  const activeMembers = circle.members.filter((member) => member.status === 'ACTIVE');
  const pendingMembers = circle.members.filter((member) => member.status === 'INVITED');
  const rankedMembers = [...activeMembers].sort((a, b) => (b.momentum?.score || 0) - (a.momentum?.score || 0));
  const maxScore = rankedMembers[0]?.momentum?.score || 0;
  const strongestMember = rankedMembers[0];
  const averageFocus = circle.activeMemberCount ? Math.round(circle.focusMinutesThisWeek / circle.activeMemberCount) : 0;
  const averageActiveDays = circle.activeMemberCount ? (circle.activeDaysThisWeek / circle.activeMemberCount).toFixed(1) : '0';

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="overflow-hidden border-border/80 bg-card shadow-ios-sm">
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-center">
          <div className="flex items-center gap-5 xl:border-r xl:border-border/60 xl:pr-6">
            <CircularProgress percentage={circle.collectiveMomentum} size={108} strokeWidth={8} color="orange"><div className="text-center"><p className="font-numeric text-2xl font-bold text-foreground">{circle.collectiveMomentum}%</p><p className="text-[10px] text-muted-foreground">collective</p></div></CircularProgress>
            <div className="min-w-0 xl:hidden"><h2 className="truncate text-xl font-semibold text-foreground">{circle.name}</h2><p className="mt-1 text-sm text-muted-foreground">{circle.activeMemberCount} active members</p></div>
          </div>
          <div className="min-w-0">
            <div className="mb-5 hidden items-start justify-between gap-4 xl:flex"><div><div className="flex items-center gap-2"><h2 className="text-xl font-semibold text-foreground">{circle.name}</h2><Badge variant="outline" className="border-[hsl(var(--chart-3))]/30 bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]">private</Badge></div><p className="mt-1 text-sm text-muted-foreground">A weekly view of the commitments this Circle is moving together.</p></div>{canManage && <Button variant="outline" size="sm" onClick={onManage}><Settings2 className="mr-2 h-4 w-4" />Manage</Button>}</div>
            <div className="mb-4 flex justify-end xl:hidden">{canManage && <Button variant="outline" size="sm" onClick={onManage}><Settings2 className="mr-2 h-4 w-4" />Manage</Button>}</div>
            <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
              <Metric label="Finished" value={circle.completedTasksThisWeek} detail="tasks this week" icon={CheckCircle2} color="text-[hsl(var(--chart-3))]" />
              <Metric label="Focused" value={formatMinutes(circle.focusMinutesThisWeek)} detail={`${formatMinutes(averageFocus)} per member`} icon={Flame} color="text-primary" />
              <Metric label="Consistency" value={averageActiveDays} detail="active days per member" icon={Target} color="text-[hsl(var(--chart-1))]" />
              <Metric label="Reviews" value={circle.quizAttemptsThisWeek} detail="quiz attempts" icon={Clock3} color="text-[hsl(var(--chart-4))]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <Card className="border-border/80 bg-card shadow-ios-sm">
          <CardContent className="p-6">
            <div className="flex items-end justify-between gap-4"><div><p className="section-header">Member rhythm</p><p className="mt-1 text-sm text-muted-foreground">Private weekly progress, visible only inside this Circle.</p></div><span className="text-xs text-muted-foreground">{activeMembers.length} active</span></div>
            <div className="mt-4">{rankedMembers.map((member) => <MemberRow key={member.userId} member={member} maxScore={maxScore} />)}</div>
            {pendingMembers.length > 0 && <div className="mt-4 border-t border-border/60 pt-4"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Awaiting response</p><div className="flex flex-wrap gap-2">{pendingMembers.map((member) => <span key={member.userId} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"><Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />{member.displayName}</span>)}</div></div>}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/80 bg-card shadow-ios-sm"><CardContent className="p-6"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Flame className="h-5 w-5" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week’s signal</p><h3 className="mt-2 text-lg font-semibold text-foreground">{circle.collectiveMomentum >= 70 ? 'The Circle has a strong rhythm.' : circle.collectiveMomentum >= 35 ? 'Momentum is building.' : 'One shared win can restart the rhythm.'}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{strongestMember && circle.completedTasksThisWeek > 0 ? `${strongestMember.displayName} is setting the pace at ${strongestMember.momentum?.score || 0}% momentum. Together you completed ${circle.completedTasksThisWeek} tasks and protected ${formatMinutes(circle.focusMinutesThisWeek)}.` : 'Start with one small focus session and one finished task. The dashboard will reflect real progress as the Circle works.'}</p></CardContent></Card>
          <Card className="border-border/80 bg-card shadow-ios-sm"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">Circle capacity</p><p className="mt-1 text-xs text-muted-foreground">{circle.activeMemberCount} active · {circle.pendingMemberCount || 0} invited</p></div><span className="font-numeric text-2xl font-bold text-foreground">{circle.activeMemberCount + (circle.pendingMemberCount || 0)}<span className="text-sm font-normal text-muted-foreground">/8</span></span></div><div className="mt-4 grid grid-cols-8 gap-1.5">{Array.from({ length: 8 }, (_, index) => <span key={index} className={`h-2 rounded-full ${index < circle.activeMemberCount ? 'bg-primary' : index < circle.activeMemberCount + (circle.pendingMemberCount || 0) ? 'bg-[hsl(var(--chart-4))]' : 'bg-muted'}`} />)}</div></CardContent></Card>
        </div>
      </div>
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
        <div><p className="eyebrow-label"><UsersRound className="h-3.5 w-3.5 text-primary" />Private circles</p><h1 className="mt-2 text-3xl font-bold text-foreground">Progress, with people you trust.</h1><p className="mt-2 max-w-2xl text-muted-foreground">A shared weekly rhythm built from real focus, completed tasks, and consistency.</p></div>
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
