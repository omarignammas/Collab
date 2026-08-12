import { format } from 'date-fns';
import { motion as Motion, useReducedMotion } from 'motion/react';

// `data` is oldest→newest: { date, active, inCurrentStreak, tasksCompleted,
// hoursWorked, courses: [{ title, percentage }] }. Full-height bar = a task was
// completed that day; the trailing run of active days counting back from today
// (or yesterday, if today's still open) is highlighted as the current streak.
export const StreakBarChart = ({ data }) => {
  const reduceMotion = useReducedMotion();

  return (
  <div className="flex h-[140px] items-end gap-1 pt-8">
    {data.map((day, i) => {
      const isFirst = i === 0;
      const isLast = i === data.length - 1;
      const tooltipPositionClass = isFirst
        ? 'left-0 translate-x-0'
        : isLast
          ? 'left-auto right-0 translate-x-0'
          : 'left-1/2 -translate-x-1/2';
      return (
      <div key={day.date} className="group relative h-full flex-1">
        <Motion.div
          tabIndex={0}
          role="img"
          aria-label={`${day.tasksCompleted} tasks completed, ${day.hoursWorked} hours worked on ${format(new Date(day.date), 'MMM d, yyyy')}`}
          className={`absolute bottom-0 left-0 w-full rounded-t-sm outline-none transition-all hover:brightness-125 focus:ring-2 focus:ring-primary/60 ${
            day.inCurrentStreak
              ? 'bg-[hsl(var(--priority-medium-fg))]'
              : day.active
                ? 'bg-[hsl(var(--chart-1)/0.4)]'
                : 'bg-muted'
          }`}
          initial={reduceMotion ? false : { height: '0%', opacity: 0 }}
          animate={{ height: day.active ? '100%' : '10%', opacity: 1 }}
          transition={{ duration: 0.42, delay: Math.min(0.65, i * 0.025), ease: 'easeOut' }}
        />

        <div className={`pointer-events-none absolute bottom-full ${tooltipPositionClass} z-10 mb-2 whitespace-nowrap rounded-lg border border-border/80 bg-popover px-3 py-2 text-center opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100`}>

          <p className="text-sm font-bold text-foreground">
            {day.tasksCompleted} task{day.tasksCompleted === 1 ? '' : 's'}
            {day.hoursWorked > 0 ? ` · ${day.hoursWorked}h worked` : ''}
          </p>
          <p className="text-[11px] text-muted-foreground">{format(new Date(day.date), 'EEE, MMM d')}</p>
          {day.courses.length > 0 && (
            <div className="mt-1 space-y-0.5 border-t border-border/60 pt-1 text-left">
              {day.courses.map((c) => (
                <p key={c.title} className="text-[11px] text-muted-foreground">
                  <span className="text-foreground">{c.title}</span> — {c.percentage}% done
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      );
    })}
  </div>
  );
};

export default StreakBarChart;
