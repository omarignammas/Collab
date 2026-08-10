import { useEffect, useState } from 'react';
import { Check, Clock3, Plus, UsersRound, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CircularProgress } from '../components/shared/CircularProgress';
import PageHero from '../components/shared/PageHero';
import Avatar from '../components/shared/Avatar';
import CreateCircleDialog from '../components/circles/CreateCircleDialog';
import circleService from '../services/circleService';
import { useToast } from '../hooks/use-toast';

const formatMinutes = (minutes) => minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim() : `${minutes}m`;

const CircleCard = ({ circle }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm"><CardContent className="p-5"><div className="flex items-start gap-4"><CircularProgress percentage={circle.collectiveMomentum} size={70} strokeWidth={6} color="orange"><span className="font-numeric text-sm font-bold text-foreground">{circle.collectiveMomentum}%</span></CircularProgress><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-semibold text-foreground">{circle.name}</h2><Badge variant="outline" className="border-[hsl(var(--chart-3))]/30 bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]">private</Badge></div><p className="mt-1 text-sm text-muted-foreground">{circle.activeMemberCount} people keeping promises this week</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-muted px-2 py-1 text-muted-foreground"><b className="text-foreground">{circle.completedTasksThisWeek}</b> tasks finished</span><span className="rounded-md bg-muted px-2 py-1 text-muted-foreground"><b className="text-foreground">{formatMinutes(circle.focusMinutesThisWeek)}</b> focused</span></div></div></div><div className="mt-5 border-t border-border/60 pt-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your people</p><div className="grid gap-2 sm:grid-cols-2">{circle.members.map((member) => <div key={member.userId} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/45 px-2.5 py-2"><Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-foreground">{member.displayName}{member.owner && <span className="ml-1 text-muted-foreground">(host)</span>}</p><p className="text-[11px] text-muted-foreground">{member.status === 'INVITED' ? 'Invitation pending' : `${member.momentum?.score || 0}% Momentum`}</p></div>{member.status === 'ACTIVE' && <span className="font-numeric text-xs font-semibold text-primary">{member.momentum?.score || 0}%</span>}</div>)}</div></div></CardContent></Card>
);

export const CirclesPage = () => {
  const { toast } = useToast();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setCircles(await circleService.getMyCircles()); } catch (error) { console.error('Could not load Circles:', error); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

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

  const invitations = circles.filter((circle) => circle.membershipStatus === 'INVITED');
  const activeCircles = circles.filter((circle) => circle.membershipStatus === 'ACTIVE');
  return <div className="accent-teal w-full px-4 py-10"><PageHero icon={UsersRound} title="Circles" subtitle="Private accountability with the people you trust." action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create Circle</Button>} />
    {loading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((key) => <div key={key} className="h-72 animate-pulse rounded-xl border border-border/80 bg-card" />)}</div> : <div className="space-y-7">
      {invitations.length > 0 && <section><p className="section-header mb-3"><Clock3 className="h-4 w-4 text-primary" />Circle invitations</p><div className="grid gap-3 md:grid-cols-2">{invitations.map((circle) => <Card key={circle.id} className="border-primary/25 bg-primary/[0.045]"><CardContent className="flex items-center gap-4 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersRound className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-foreground">{circle.name}</p><p className="mt-1 text-sm text-muted-foreground">{circle.ownerName} invited you to join.</p></div><div className="flex gap-2"><Button size="icon" title="Accept" disabled={busyId === circle.id} onClick={() => respond(circle.id, true)}><Check className="h-4 w-4" /></Button><Button size="icon" title="Decline" variant="outline" disabled={busyId === circle.id} onClick={() => respond(circle.id, false)}><X className="h-4 w-4" /></Button></div></CardContent></Card>)}</div></section>}
      {activeCircles.length ? <section><p className="section-header mb-3">your Circles ({activeCircles.length})</p><div className="grid gap-4 xl:grid-cols-2">{activeCircles.map((circle) => <CircleCard key={circle.id} circle={circle} />)}</div></section> : <div className="rounded-xl border-2 border-dashed border-border/70 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold text-foreground">Progress feels lighter with people around you.</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create a small private Circle and invite friends who want to keep their own promises, together.</p><Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create your first Circle</Button></div>}
    </div>}
    <CreateCircleDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(circle) => { setCircles((current) => [circle, ...current]); setCreateOpen(false); toast({ title: 'Circle created', description: 'Your friends have been invited.' }); }} />
  </div>;
};

export default CirclesPage;
