import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, CheckCircle2, Clock3, Flame, ListTodo, Play, Sparkles, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CircularProgress } from '../components/shared/CircularProgress';
import { CreateFocusRoomDialog } from '../components/focus-rooms/CreateFocusRoomDialog';
import { useAuth } from '../hooks/useAuth';
import momentumService from '../services/momentumService';
import circleService from '../services/circleService';

const priorityStyle = {
  HIGH: 'bg-destructive',
  MEDIUM: 'bg-primary',
  LOW: 'bg-[hsl(var(--chart-1))]',
};

const greetingForHour = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const taskMeta = (task) => {
  if (!task?.dueDate) return task?.courseTitle || 'No due date';
  const today = format(new Date(), 'yyyy-MM-dd');
  if (task.dueDate < today) return `Overdue · ${task.courseTitle || 'Personal'}`;
  if (task.dueDate === today) return `Due today · ${task.courseTitle || 'Personal'}`;
  return `${format(new Date(`${task.dueDate}T12:00:00`), 'EEE, MMM d')} · ${task.courseTitle || 'Personal'}`;
};

const EmptyPlan = () => (
  <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/80 bg-card/70 p-6 sm:flex-row sm:items-center">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--status-done-bg))] text-[hsl(var(--status-done-fg))]"><CheckCircle2 className="h-5 w-5" /></span>
    <div><p className="font-medium text-foreground">Nothing urgent is waiting for you.</p><p className="mt-1 text-sm text-muted-foreground">Use the space for a small focus session, or add your next meaningful task.</p></div>
  </div>
);

export const TodayPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brief, setBrief] = useState(null);
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [briefResult, circleResult] = await Promise.all([momentumService.getTodayBrief(), circleService.getMyCircles()]);
      setBrief(briefResult);
      setCircles((circleResult || []).filter((circle) => circle.membershipStatus === 'ACTIVE'));
    } catch (error) {
      console.error('Could not load today brief:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const momentum = brief?.momentum;
  const activeCircle = useMemo(() => circles[0], [circles]);

  return (
    <div className="accent-amber w-full px-4 py-8 sm:py-10">
      <div className="mb-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">{format(new Date(), 'EEEE, d MMMM')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{greetingForHour()}, {user?.firstName || 'there'}.</h1>
        <p className="mt-2 text-lg text-muted-foreground">Make room for the things that move you forward.</p>
      </div>

      {loading ? (
        <div className="h-80 animate-pulse rounded-xl border border-border/80 bg-card" />
      ) : (
        <div className="space-y-7">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="overflow-hidden border-primary/25 bg-primary/[0.055] shadow-ios-sm">
              <CardContent className="grid min-h-[286px] gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
                <div className="min-w-0">
                  <p className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" />Your next best action</p>
                  {brief?.nextAction ? (
                    <>
                      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{brief.nextAction.title}</h2>
                      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{brief.overdueCount > 0 ? `You have ${brief.overdueCount} overdue task${brief.overdueCount === 1 ? '' : 's'}, so this is the clearest place to restart.` : `This is one of your closest commitments. Give it a protected focus block before moving on.`}</p>
                    </>
                  ) : (
                    <><h2 className="text-2xl font-bold text-foreground">Your day is open.</h2><p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">Start a room for something you have been meaning to make progress on.</p></>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {brief?.nextAction && <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground"><span className={`h-2 w-2 rounded-full ${priorityStyle[brief.nextAction.priority] || 'bg-primary'}`} />{taskMeta(brief.nextAction)}</span>}
                    {brief?.nextAction?.durationMinutes && <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />~{brief.nextAction.durationMinutes} min</span>}
                  </div>
                </div>
                <Button className="h-12 px-5 text-sm" onClick={() => setFocusDialogOpen(true)}><Play className="h-4 w-4 fill-current" />Start a focus room</Button>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-ios-sm">
              <CardContent className="flex h-full min-h-[286px] flex-col items-center justify-center p-6 text-center">
                <CircularProgress percentage={momentum?.score || 0} size={132} strokeWidth={10} color="orange"><div><p className="font-numeric text-3xl font-bold text-foreground">{momentum?.score || 0}%</p><p className="text-[11px] text-muted-foreground">Momentum</p></div></CircularProgress>
                <p className="mt-4 text-sm font-semibold text-foreground">Your week, in motion</p>
                <p className="mt-1 max-w-[210px] text-xs leading-relaxed text-muted-foreground">{momentum?.score >= 70 ? 'You are keeping strong promises to yourself this week.' : 'Every completed focus block gives your week more shape.'}</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between"><p className="section-header"><ListTodo className="h-4 w-4 text-primary" />Today’s plan</p><span className="text-xs text-muted-foreground">{brief?.openTaskCount || 0} open</span></div>
            {brief?.plan?.length ? <div className="grid gap-3 md:grid-cols-3">{brief.plan.map((task, index) => <button key={task.id} type="button" onClick={() => navigate('/tasks')} className="group flex min-h-28 flex-col items-start rounded-xl border border-border/80 bg-card p-5 text-left shadow-ios-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-ios"><div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')} · {taskMeta(task)}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></div><p className="mt-4 text-sm font-semibold text-foreground">{task.title}</p></button>)}</div> : <EmptyPlan />}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="border-border/80 bg-card"><CardContent className="p-5"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Flame className="h-5 w-5" /></span><div className="min-w-0"><p className="font-semibold text-foreground">Momentum comes from real work</p><p className="mt-1 text-sm text-muted-foreground">{momentum?.completedTasks || 0} tasks completed, {momentum?.focusMinutes || 0} focused minutes, and {momentum?.activeDays || 0} active days this week.</p><div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4"><div className="rounded-lg bg-muted/60 px-2 py-2"><b className="block text-foreground">{momentum?.taskPoints || 0}/50</b><span className="text-muted-foreground">tasks</span></div><div className="rounded-lg bg-muted/60 px-2 py-2"><b className="block text-foreground">{momentum?.focusPoints || 0}/30</b><span className="text-muted-foreground">focus</span></div><div className="rounded-lg bg-muted/60 px-2 py-2"><b className="block text-foreground">{momentum?.quizPoints || 0}/10</b><span className="text-muted-foreground">quiz</span></div><div className="rounded-lg bg-muted/60 px-2 py-2"><b className="block text-foreground">{momentum?.consistencyPoints || 0}/10</b><span className="text-muted-foreground">rhythm</span></div></div></div></div></CardContent></Card>
            <Card className="border-border/80 bg-card"><CardContent className="flex h-full flex-col items-start gap-4 p-5 min-[360px]:flex-row min-[360px]:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--chart-3))]/15 text-[hsl(var(--chart-3))]"><UsersRound className="h-5 w-5" /></span><div className="min-w-0 flex-1">{activeCircle ? <><p className="font-semibold text-foreground">{activeCircle.name}</p><p className="mt-1 text-sm text-muted-foreground">{activeCircle.activeMemberCount} people · {activeCircle.collectiveMomentum}% collective momentum this week.</p></> : <><p className="font-semibold text-foreground">Progress is better shared</p><p className="mt-1 text-sm text-muted-foreground">Create a private Circle with friends who want to show up together.</p></>}</div><Button className="w-full min-[360px]:w-auto" type="button" size="sm" variant="outline" onClick={() => navigate('/circles')}>{activeCircle ? 'Open' : 'Create'}</Button></CardContent></Card>
          </section>
        </div>
      )}
      <CreateFocusRoomDialog open={focusDialogOpen} onOpenChange={setFocusDialogOpen} onRoomCreated={(room) => navigate(`/focus-rooms/${room.code}`)} />
    </div>
  );
};

export default TodayPage;
