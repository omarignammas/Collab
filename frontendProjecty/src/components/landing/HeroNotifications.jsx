import { useEffect, useState } from 'react';
import { Flame, UserPlus, GraduationCap, Bell } from 'lucide-react';

const CYCLE_MS = 13000;
const VISIBLE_MS = 4200;

// Anchored a fixed distance from the section's horizontal center (not a % of
// viewport width) so the cards sit right up against the centered max-w-3xl
// heading column's edge at any width, instead of drifting further away on
// wider screens. 660px = half the heading column (384px) + card width (256px)
// + a ~20px gap — the min-[1400px] reveal guarantees that still fits on-screen.
const CARDS = [
  {
    key: 'streak',
    icon: Flame,
    title: 'Streak',
    body: "7 days running — don't break it today.",
    position: 'left-[calc(50%_-_660px)] top-[32%]',
    delay: 0,
  },
  {
    key: 'friend-request',
    icon: UserPlus,
    title: 'Friend request',
    body: 'Mira wants to add you as a friend.',
    position: 'right-[calc(50%_-_660px)] top-[40%]',
    delay: 3300,
  },
  {
    key: 'course-completed',
    icon: GraduationCap,
    title: 'Project completed',
    body: 'Data Structures & Algorithms — 100% done.',
    position: 'left-[calc(50%_-_660px)] top-[48%]',
    delay: 6600,
  },
  {
    key: 'reminder',
    icon: Bell,
    title: 'Reminder',
    body: 'Problem Set 5 is due tomorrow.',
    position: 'right-[calc(50%_-_660px)] top-[56%]',
    delay: 9900,
  },
];

// Same self-perpetuating setTimeout pattern used by the other landing showcases —
// each card runs its own independent show/hide loop, staggered by `delay`.
const HeroNotificationCard = ({ card }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer;
    let hideTimer;
    const scheduleShow = (wait) => {
      showTimer = setTimeout(() => {
        setVisible(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          scheduleShow(CYCLE_MS - VISIBLE_MS);
        }, VISIBLE_MS);
      }, wait);
    };
    scheduleShow(card.delay);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [card.delay]);

  return (
    <div
      className={`absolute hidden w-64 rounded-2xl rounded-bl-md bg-primary p-3 text-primary-foreground shadow-xl transition-all duration-500 dark:bg-white dark:text-slate-900 min-[1400px]:block ${card.position} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900">
          <card.icon className="h-3 w-3" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-foreground/70 dark:text-slate-900/60">Collab · now</span>
      </div>
      <p className="text-sm font-semibold text-primary-foreground dark:text-slate-900">{card.title}</p>
      <p className="text-xs text-primary-foreground/80 dark:text-slate-900/70">{card.body}</p>
    </div>
  );
};

export const HeroNotifications = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
    {CARDS.map((card) => (
      <HeroNotificationCard key={card.key} card={card} />
    ))}
  </div>
);

export default HeroNotifications;
