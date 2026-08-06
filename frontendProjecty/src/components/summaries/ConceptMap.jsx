import { useMemo } from 'react';

// Replaces the old Mermaid-rendered diagram — Mermaid rendered unreliably
// inside the desktop app's WebView (it's built around a full browser DOM/worker
// environment Mermaid assumes). This draws the same idea, a concept tree, as
// plain SVG we fully control: no external renderer, nothing that can fail
// differently per platform. The backend now sends a small {label, children}
// JSON tree instead of Mermaid syntax specifically so this can stay simple.

const COL_WIDTH = 200;
const ROW_HEIGHT = 46;
const NODE_HEIGHT = 34;
const ROOT_NODE_HEIGHT = 42;

// Same four-color cycle CircularProgress draws from, so a concept map and a
// progress ring on the same page never introduce a fifth unrelated hue.
const BRANCH_CHART_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4'];

const nodeWidth = (label, isRoot) => {
  const base = isRoot ? 34 : 28;
  return Math.round(Math.min(220, Math.max(84, label.length * 6.6 + base)));
};

// Post-order layout: leaves get sequential row slots, parents center on the
// mean of their children's rows — the standard tidy-tree approach, done by
// hand since pulling in a layout library for one diagram type isn't worth it.
const layoutChildren = (children, depth, colorIndex, rowCounter) =>
  (children || []).map((child) => {
    const width = nodeWidth(child.label, false);
    const grandchildren = layoutChildren(child.children, depth + 1, colorIndex, rowCounter);
    const y = grandchildren.length
      ? grandchildren.reduce((sum, c) => sum + c.y, 0) / grandchildren.length
      : rowCounter.next();
    return { label: child.label, depth, x: depth * COL_WIDTH, y, width, height: NODE_HEIGHT, colorIndex, children: grandchildren };
  });

const layoutTree = (root) => {
  const rowCounter = { count: 0, next() { return (this.count++) * ROW_HEIGHT; } };
  const rootChildren = (root.children || []).map((child, i) =>
    layoutChildren([child], 1, i % BRANCH_CHART_VARS.length, rowCounter)[0]
  );
  const rootY = rootChildren.length
    ? rootChildren.reduce((sum, c) => sum + c.y, 0) / rootChildren.length
    : 0;
  const width = nodeWidth(root.label, true);
  return { label: root.label, depth: 0, x: 0, y: rootY, width, height: ROOT_NODE_HEIGHT, colorIndex: -1, children: rootChildren };
};

// Flattens the positioned tree into a node list plus parent→child connector
// endpoints, since it's simpler to render two flat SVG passes (edges behind
// nodes) than to nest components nine layers deep for a 3-level tree.
const flatten = (node, parent, acc = { nodes: [], edges: [] }) => {
  acc.nodes.push(node);
  if (parent) {
    acc.edges.push({
      x1: parent.x + parent.width,
      y1: parent.y + parent.height / 2,
      x2: node.x,
      y2: node.y + node.height / 2,
      colorIndex: node.colorIndex,
    });
  }
  node.children.forEach((child) => flatten(child, node, acc));
  return acc;
};

const curvePath = (x1, y1, x2, y2) => {
  const midX = x1 + (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
};

export const ConceptMap = ({ json }) => {
  const tree = useMemo(() => {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed.label !== 'string') return null;
      return layoutTree(parsed);
    } catch {
      return null;
    }
  }, [json]);

  if (!tree) return null;

  const { nodes, edges } = flatten(tree, null);
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const maxRight = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const padding = 16;
  const svgWidth = maxRight + padding * 2;
  const svgHeight = maxY + padding * 2;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-card p-4">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
        style={{ minWidth: maxDepth > 1 ? svgWidth : undefined }}
      >
        <g transform={`translate(${padding}, ${padding})`}>
          {edges.map((e, i) => (
            <path
              key={i}
              d={curvePath(e.x1, e.y1, e.x2, e.y2)}
              fill="none"
              stroke={`hsl(var(${BRANCH_CHART_VARS[e.colorIndex]}) / 0.55)`}
              strokeWidth={2}
            />
          ))}
          {nodes.map((n, i) => {
            const isRoot = n.colorIndex === -1;
            const stroke = isRoot ? 'hsl(var(--primary))' : `hsl(var(${BRANCH_CHART_VARS[n.colorIndex]}))`;
            return (
              <g key={i} transform={`translate(${n.x}, ${n.y})`}>
                <rect
                  width={n.width}
                  height={n.height}
                  rx={n.height / 2}
                  fill={isRoot ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--card))'}
                  stroke={stroke}
                  strokeWidth={isRoot ? 2 : 1.5}
                />
                <text
                  x={n.width / 2}
                  y={n.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={isRoot ? 'font-semibold' : 'font-medium'}
                  fill={isRoot ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                  fontSize={isRoot ? 13 : 11.5}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default ConceptMap;
