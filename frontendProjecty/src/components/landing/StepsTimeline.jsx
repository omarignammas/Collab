import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

// Walks the given steps on a loop: each becomes "active", then "done" as the
// connecting line fills in behind it, then everything resets and plays again.
export const StepsTimeline = ({ steps }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const DURATIONS = [1600, 1600, 1600, 2400];
    let timeoutId = setTimeout(function step(idx = 0) {
      const nextIdx = (idx + 1) % (steps.length + 1);
      setStage(nextIdx);
      timeoutId = setTimeout(() => step(nextIdx), DURATIONS[nextIdx % DURATIONS.length]);
    }, DURATIONS[0]);
    return () => clearTimeout(timeoutId);
  }, [steps.length]);

  const progressPct = (Math.min(stage, steps.length - 1) / (steps.length - 1)) * 100;

  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-5 hidden h-0.5 bg-border md:block" aria-hidden="true" />
      <div
        className="absolute left-0 top-5 hidden h-0.5 bg-primary transition-all duration-700 ease-out md:block"
        style={{ width: `${progressPct}%` }}
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3">
        {steps.map((step, i) => {
          const isDone = i < stage;
          const isActive = i === stage;
          return (
            <div key={step.number} className="text-left">
              <div
                className={`relative z-10 mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background font-numeric text-sm font-semibold transition-all duration-500 ${
                  isDone
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isActive
                      ? 'scale-110 border-primary text-primary shadow-[0_0_0_5px_hsl(var(--primary)/0.15)]'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.number}
              </div>
              <h3
                className={`mb-2 text-lg font-semibold transition-colors duration-500 ${
                  isActive || isDone ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepsTimeline;
