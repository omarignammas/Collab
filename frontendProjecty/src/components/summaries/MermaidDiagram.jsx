import { useEffect, useId, useState } from 'react';

// mermaid.render() produces a static SVG string once — re-run it whenever the
// code or the app's actual applied theme changes (read straight off <html>,
// not next-themes' useTheme — nothing in this app mounts a next-themes
// provider, so that hook always reads "system"). Keeps mermaid's default
// securityLevel "strict" (bundled DOMPurify sanitizes the SVG output) since
// this is the first dangerouslySetInnerHTML in the app and the diagram code
// is LLM-derived, untrusted, and — via sharing — can come from a friend.
//
// mermaid is dynamically imported (not a static top-level import) — its core
// alone is several hundred KB before any diagram-type chunk, and statically
// importing it here would bundle that weight into every page that renders a
// SummaryDetailPage, even ones that never show a diagram.
export const MermaidDiagram = ({ code }) => {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!code) return undefined;
    let cancelled = false;

    import('mermaid').then(({ default: mermaid }) => {
      if (cancelled) return;
      const isDark = document.documentElement.classList.contains('dark');
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark ? 'dark' : 'default' });

      mermaid.render(`mermaid-${rawId}`, code)
        .then(({ svg: rendered }) => {
          if (!cancelled) {
            setSvg(rendered);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [code, rawId]);

  if (!code || failed) {
    return null;
  }

  if (!svg) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-border/60 bg-card text-xs text-muted-foreground">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram overflow-x-auto rounded-lg border border-border/60 bg-card p-4 [&_svg]:mx-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;
