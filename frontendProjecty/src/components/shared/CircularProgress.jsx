
import { motion as Motion, useReducedMotion } from 'motion/react';

const CHART_VARS = {
  blue: '--chart-1',
  purple: '--chart-2',
  green: '--chart-3',
  orange: '--chart-4',
};

export const CircularProgress = ({ percentage, size = 120, strokeWidth = 10, color = "blue", children }) => {

  const reduceMotion = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const chartVar = CHART_VARS[color] || CHART_VARS.blue;
  // Scale the number with the ring instead of a fixed size — a 44px ring and a
  // 220px ring need very different type sizes to both read as "the hero number".
  const innerDiameter = size - strokeWidth * 2;
  const fontSize = Math.max(10, Math.min(56, Math.round(innerDiameter * 0.4)));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Background circle */}
        <Motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`hsl(var(${chartVar}))`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span className="font-numeric font-bold text-foreground" style={{ fontSize }}>
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
};
