import { useEffect, useState } from 'react';
import { Users, Bell, CheckCircle2 } from 'lucide-react';
import Avatar from '../shared/Avatar';

const ROOM_NAME = 'Deep Work Sprint';

const PHASES = [
  { key: 'invite', duration: 1700 },
  { key: 'toast', duration: 2400 },
  { key: 'joined', duration: 2400 },
];

const FriendRow = ({ name, sub, pinging = false, done = false }) => (
  <div className="flex items-center gap-3">
    <span className="relative flex h-6 w-6 shrink-0">
      {pinging && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--status-done-fg))] opacity-60" />
      )}
      <Avatar name={name} size="sm" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-foreground">{name}</p>
      <p className="truncate text-xs text-muted-foreground transition-opacity duration-500">{sub}</p>
    </div>
    {done && <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--status-done-fg))]" />}
  </div>
);

export const CollaborateShowcase = () => {
  const [phase, setPhase] = useState('invite');

  useEffect(() => {
    let timeoutId = setTimeout(function step(idx = 0) {
      const nextIdx = (idx + 1) % PHASES.length;
      setPhase(PHASES[nextIdx].key);
      timeoutId = setTimeout(() => step(nextIdx), PHASES[nextIdx].duration);
    }, PHASES[0].duration);
    return () => clearTimeout(timeoutId);
  }, []);

  const showToast = phase === 'toast';
  const youJoined = phase === 'joined';

  const miraSub =
    phase === 'invite' ? 'inviting you to Deep Work Sprint…' : phase === 'toast' ? 'invite sent' : `in ${ROOM_NAME} with you`;

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-xl border border-border/80 bg-card p-5">
        <p className="section-header mb-4">
          <Users className="h-3.5 w-3.5" />
          friends
        </p>
        <div className="space-y-4">
          <FriendRow name="Mira" sub={miraSub} pinging={phase === 'invite'} done={youJoined} />
          <FriendRow name="Deniz" sub="online" />
          <FriendRow name="Sam" sub="offline" />
        </div>
      </div>

      <div className="relative overflow-visible rounded-xl border border-border/80 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{ROOM_NAME}</p>
            <p className="text-xs text-muted-foreground">Focus Room · Pomodoro</p>
          </div>
          <span className="rounded-md border border-border/70 px-2 py-1 font-numeric text-xs text-muted-foreground">#7F2K</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Avatar name="Mira" size="sm" />
            <span className="text-foreground">Mira</span>
            <span className="ml-auto text-xs text-muted-foreground">focusing</span>
          </div>
          <div
            className={`flex items-center gap-2 text-sm transition-all duration-500 ${
              youJoined ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
            }`}
          >
            <Avatar name="You" size="sm" />
            <span className="text-foreground">You</span>
            <span className="ml-auto text-xs text-[hsl(var(--status-done-fg))]">joined</span>
          </div>
        </div>

        <div className="mt-4 flex min-h-[20px] items-center border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {youJoined && (
            <p className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--status-done-fg))]" />
              You joined the room
            </p>
          )}
        </div>

        {/* real-time notification toast — mirrors the actual NotificationBell / focus-room-invite flow */}
        <div
          className={`absolute -right-3 -top-6 w-64 rounded-lg border border-primary/40 bg-card p-3 shadow-xl transition-all duration-500 sm:-right-6 ${
            showToast ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bell className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Focus Room invite</p>
              <p className="text-[11px] text-muted-foreground">
                Mira invited you to <span className="text-foreground">{ROOM_NAME}</span>
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <span className="rounded-md px-2 py-1 text-[11px] text-muted-foreground">Later</span>
            <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">Join</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborateShowcase;
