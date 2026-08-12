import { format } from 'date-fns';
import { motion as Motion, useReducedMotion } from 'motion/react';

// GitHub-style contribution grid: `data` is a flat, oldest→newest array of
// { date: 'yyyy-MM-dd', count, isFuture } whose length is a multiple of 7,
// aligned so index 0 is a Sunday — grouped here into one column per week.
const LEVEL_CLASSES = [
  'bg-muted',
  'bg-[hsl(var(--chart-1)/0.25)]',
  'bg-[hsl(var(--chart-1)/0.5)]',
  'bg-[hsl(var(--chart-1)/0.75)]',
  'bg-[hsl(var(--chart-1))]',
];

const levelFor = (count) => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
};

export const ActivityHeatmap = ({ data }) => {
  const reduceMotion = useReducedMotion();
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  let lastMonth = null;

  return (
    <div className="overflow-x-auto pt-8">
      <div className="inline-flex gap-1">
        {weeks.map((week, wi) => {
          const firstDay = week[0];
          const month = firstDay ? format(new Date(firstDay.date), 'MMM') : '';
          const showMonth = month !== lastMonth;
          if (showMonth) lastMonth = month;

          const isFirstWeek = wi === 0;
          const isLastWeek = wi === weeks.length - 1;
          const tooltipPositionClass = isFirstWeek
            ? 'left-0 translate-x-0'
            : isLastWeek
              ? 'left-auto right-0 translate-x-0'
              : 'left-1/2 -translate-x-1/2';

          return (
            <div key={wi} className="flex flex-col gap-1">
              <p className="h-3 text-[9px] leading-3 text-muted-foreground">{showMonth ? month : ''}</p>
              {week.map((day, dayIndex) => (
                <div key={day.date} className="group relative">
                  <Motion.div
                    tabIndex={day.isFuture ? -1 : 0}
                    role="img"
                    aria-label={
                      day.isFuture
                        ? undefined
                        : `${day.count} task${day.count === 1 ? '' : 's'} completed on ${format(new Date(day.date), 'MMM d, yyyy')}`
                    }
                    className={`h-3 w-3 rounded-sm outline-none transition-all ${
                      day.isFuture
                        ? 'invisible'
                        : `${LEVEL_CLASSES[levelFor(day.count)]} hover:ring-2 hover:ring-primary/60 focus:ring-2 focus:ring-primary/60`
                    }`}
                    initial={reduceMotion || day.isFuture ? false : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: day.isFuture ? 0 : 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(0.7, (wi * 7 + dayIndex) * 0.012) }}
                  />
                  {!day.isFuture && (
                    <div className={`pointer-events-none absolute bottom-full ${tooltipPositionClass} z-10 mb-2 whitespace-nowrap rounded-lg border border-border/80 bg-popover px-2.5 py-1.5 text-center opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100`}>
                      <p className="text-sm font-bold text-foreground">
                        {day.count} task{day.count === 1 ? '' : 's'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(day.date), 'EEE, MMM d')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityHeatmap;
