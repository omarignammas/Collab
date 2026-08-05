import { useState, useRef, useEffect } from 'react';

// Single-series trend (sequential/brand hue) with crosshair + tooltip on hover.
export const TrendAreaChart = ({ data, height = 200, valueLabel = 'completed' }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 16, right: 4, bottom: 22, left: 4 };
  const innerW = Math.max(width - padding.left - padding.right, 1);
  const innerH = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.value / maxValue) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const baseY = padding.top + innerH;
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseY} L ${points[0].x.toFixed(1)} ${baseY} Z`
    : '';

  const handleMove = (e) => {
    if (!containerRef.current || stepX <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(x / stepX)));
    setHoverIndex(idx);
  };

  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          <line
            x1={padding.left}
            y1={baseY}
            x2={padding.left + innerW}
            y2={baseY}
            stroke="hsl(var(--chart-gridline))"
            strokeWidth="1"
          />
          <path d={areaPath} fill="hsl(var(--primary))" fillOpacity="0.1" stroke="none" />
          <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {hovered && (
            <>
              <line
                x1={hovered.x}
                y1={padding.top}
                x2={hovered.x}
                y2={baseY}
                stroke="hsl(var(--chart-muted))"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle cx={hovered.x} cy={hovered.y} r="4" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
            </>
          )}

          {points
            .filter((_, i) => i % labelEvery === 0)
            .map((p) => (
              <text key={p.label} x={p.x} y={height - 4} fontSize="10" textAnchor="middle" fill="hsl(var(--chart-muted))">
                {p.label}
              </text>
            ))}
        </svg>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hovered.x, top: Math.max(0, hovered.y - 46) }}
        >
          <p className="font-semibold text-foreground">{hovered.value} {valueLabel}</p>
          <p className="text-muted-foreground">{hovered.fullLabel || hovered.label}</p>
        </div>
      )}
    </div>
  );
};

export default TrendAreaChart;
