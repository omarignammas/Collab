import { createElement, useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Check,
  Clock3,
  HelpCircle,
  Lightbulb,
  LockKeyhole,
  Megaphone,
  Plus,
  Send,
  Settings2,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CircularProgress } from '../components/shared/CircularProgress';
import Avatar from '../components/shared/Avatar';
import CreateCircleDialog from '../components/circles/CreateCircleDialog';
import ManageCircleDialog from '../components/circles/ManageCircleDialog';
import circleService from '../services/circleService';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

const formatMinutes = (minutes = 0) => minutes >= 60
  ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()
  : `${minutes}m`;

const NOTE_TYPES = [
  { value: 'UPDATE', label: 'Update', icon: Megaphone, color: 'text-[hsl(var(--chart-3))]', surface: 'bg-[hsl(var(--chart-3))]/10' },
  { value: 'BUG', label: 'Bug', icon: Bug, color: 'text-destructive', surface: 'bg-destructive/10' },
  { value: 'IDEA', label: 'Idea', icon: Lightbulb, color: 'text-primary', surface: 'bg-primary/10' },
  { value: 'QUESTION', label: 'Question', icon: HelpCircle, color: 'text-[hsl(var(--chart-1))]', surface: 'bg-[hsl(var(--chart-1))]/10' },
];
const noteTypeMeta = Object.fromEntries(NOTE_TYPES.map((entry) => [entry.value, entry]));

const formatNoteDay = (noteDate) => {
  const date = new Date(`${noteDate}T00:00:00`);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
};

const CircleHeader = ({ circle, canManage, onManage }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <CircularProgress percentage={circle.collectiveMomentum} size={64} strokeWidth={6} color="orange">
          <span className="font-numeric text-sm font-bold text-foreground">{circle.collectiveMomentum}%</span>
        </CircularProgress>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold text-foreground">{circle.name}</h2>
            <Badge variant="outline" className="border-[hsl(var(--chart-3))]/30 bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]"><LockKeyhole className="mr-1 h-3 w-3" />Private</Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground"><b className="text-foreground">{circle.completedTasksThisWeek}</b> finished this week</span>
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground"><b className="text-foreground">{formatMinutes(circle.focusMinutesThisWeek)}</b> focused this week</span>
          </div>
        </div>
      </div>
      {canManage && <Button variant="outline" size="sm" onClick={onManage}><Settings2 className="mr-2 h-4 w-4" />Manage</Button>}
    </CardContent>
  </Card>
);

const TeamTime = ({ members }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="p-5 sm:p-6">
      <p className="section-header">Your people</p>
      <p className="mt-1 text-sm text-muted-foreground">Time focused this week, in the open.</p>
      <div className="mt-4 space-y-1">
        {members.map((member) => (
          <div key={member.userId} className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-2">
            <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {member.displayName}{member.owner && <span className="ml-1.5 text-xs text-muted-foreground">Founder</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">{member.status === 'INVITED' ? 'Invitation pending' : 'Active this week'}</p>
            </div>
            {member.status !== 'INVITED' && (
              <span className="font-numeric shrink-0 text-sm font-semibold text-foreground">{formatMinutes(member.focusMinutesThisWeek)}</span>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const NoteComposer = ({ circleId, onAdded }) => {
  const { toast } = useToast();
  const [type, setType] = useState('UPDATE');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const note = await circleService.addNote(circleId, { type, body: trimmed });
      onAdded(note);
      setBody('');
    } catch (error) {
      toast({ title: 'Could not post note', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Log a bug, an update, an idea, or a question for the team..."
        className="min-h-20 resize-none text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                <span className="flex items-center gap-2">{createElement(entry.icon, { className: `h-3.5 w-3.5 ${entry.color}` })}{entry.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={!body.trim() || saving}>
          <Send className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </form>
  );
};

const NoteRow = ({ note, canDelete, onDelete }) => {
  const meta = noteTypeMeta[note.type] || noteTypeMeta.UPDATE;
  return (
    <div className="group flex items-start gap-3 py-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.surface} ${meta.color}`}>
        {createElement(meta.icon, { className: 'h-3.5 w-3.5' })}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{note.authorName}</span>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
          <span className="text-[10px] text-muted-foreground">{format(new Date(note.createdAt), 'h:mm a')}</span>
        </div>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{note.body}</p>
      </div>
      {canDelete && (
        <button type="button" onClick={() => onDelete(note.id)} title="Delete note" className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

const CircleNotes = ({ circleId, currentUserId, isOwner }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    let active = true;
    setLoading(true);
    circleService.getNotes(circleId)
      .then((result) => { if (active) setNotes(result); })
      .catch(() => { if (active) toast({ title: 'Could not load notes', variant: 'destructive' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [circleId]);

  const deleteNote = async (noteId) => {
    setNotes((current) => current.filter((note) => note.id !== noteId));
    try {
      await circleService.deleteNote(circleId, noteId);
    } catch {
      toast({ title: 'Could not delete note', variant: 'destructive' });
    }
  };

  const filtered = filter === 'ALL' ? notes : notes.filter((note) => note.type === filter);
  const grouped = useMemo(() => {
    const byDay = new Map();
    filtered.forEach((note) => {
      const bucket = byDay.get(note.noteDate) || [];
      bucket.push(note);
      byDay.set(note.noteDate, bucket);
    });
    return [...byDay.entries()];
  }, [filtered]);

  return (
    <Card className="border-border/80 bg-card shadow-ios-sm">
      <CardContent className="p-5 sm:p-6">
        <p className="section-header">Notes</p>
        <p className="mt-1 text-sm text-muted-foreground">A daily log for updates, bugs, ideas, and questions.</p>

        <div className="mt-4"><NoteComposer circleId={circleId} onAdded={(note) => setNotes((current) => [note, ...current])} /></div>

        <div className="mt-5 flex gap-4 border-b border-border/60">
          {['ALL', ...NOTE_TYPES.map((entry) => entry.value)].map((value) => {
            const active = filter === value;
            const label = value === 'ALL' ? 'All' : noteTypeMeta[value].label;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`relative pb-2.5 text-[13px] font-medium transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
              >
                {label}
                {active && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">{[0, 1, 2].map((key) => <div key={key} className="h-14 animate-pulse rounded-lg bg-muted/50" />)}</div>
        ) : grouped.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Nothing logged yet. Be the first to post.</p>
        ) : (
          <div className="mt-1 divide-y divide-border/50">
            {grouped.map(([day, dayNotes]) => (
              <div key={day} className="py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{formatNoteDay(day)}</p>
                <div className="divide-y divide-border/40">
                  {dayNotes.map((note) => (
                    <NoteRow key={note.id} note={note} canDelete={note.mine || isOwner} onDelete={deleteNote} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
      toast({ title: accepted ? 'Welcome to the team' : 'Invitation declined' });
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
        <div>
          <p className="eyebrow-label"><UsersRound className="h-3.5 w-3.5 text-primary" />Private circles</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Your team, in one place.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">A private space for the people building this with you — time, notes, and progress, out in the open between you.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Circle</Button>
      </div>

      {loading ? <div className="h-[420px] animate-pulse rounded-xl border border-border/80 bg-card" /> : (
        <div className="space-y-7">
          {invitations.length > 0 && (
            <section>
              <p className="section-header mb-3"><Clock3 className="h-4 w-4 text-primary" />Circle invitations</p>
              <div className="grid gap-3 md:grid-cols-2">
                {invitations.map((circle) => (
                  <Card key={circle.id} className="border-primary/25 bg-primary/[0.045]">
                    <CardContent className="flex items-center gap-4 p-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersRound className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{circle.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{circle.ownerName} invited you to join.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" title="Accept" disabled={busyId === circle.id} onClick={() => respond(circle.id, true)}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" title="Decline" variant="outline" disabled={busyId === circle.id} onClick={() => respond(circle.id, false)}><X className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {activeCircles.length ? (
            <>
              {activeCircles.length > 1 && (
                <div className="flex gap-4 border-b border-border/60">
                  {activeCircles.map((circle) => {
                    const active = selectedCircle?.id === circle.id;
                    return (
                      <button
                        key={circle.id}
                        type="button"
                        onClick={() => setSelectedCircleId(circle.id)}
                        className={`relative pb-2.5 text-sm font-medium transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                      >
                        {circle.name}
                        {active && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedCircle && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CircleHeader circle={selectedCircle} canManage={selectedCircle.ownerId === user?.id} onManage={() => setManageOpen(true)} />
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-start">
                    <TeamTime members={selectedCircle.members} />
                    <CircleNotes circleId={selectedCircle.id} currentUserId={user?.id} isOwner={selectedCircle.ownerId === user?.id} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border/70 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="h-6 w-6" /></span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">Build this with your team.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create a private Circle for the people you're building this with — see time, drop notes, and stay in sync without another tool.</p>
              <Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create your first Circle</Button>
            </div>
          )}
        </div>
      )}

      <CreateCircleDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(circle) => { setCircles((current) => [circle, ...current]); setSelectedCircleId(circle.id); setCreateOpen(false); toast({ title: 'Circle created', description: 'Your private team space is ready.' }); }} />
      <ManageCircleDialog circle={selectedCircle} open={manageOpen} onOpenChange={setManageOpen} onUpdated={updateCircle} onDeleted={deleteCircle} />
    </div>
  );
};

export default CirclesPage;
