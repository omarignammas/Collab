// Shared ReactMarkdown component-override map — renders AI-generated markdown
// (session reports, course summaries) with this app's own Tailwind tokens
// instead of pulling in a typography/prose plugin.
export const markdownComponents = {
  h1: (props) => <h2 className="mb-3 mt-6 text-xl font-bold text-foreground first:mt-0" {...props} />,
  h2: (props) => <h3 className="mb-2 mt-5 text-lg font-semibold text-foreground first:mt-0" {...props} />,
  h3: (props) => <h4 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0" {...props} />,
  p: (props) => <p className="mb-3 text-sm leading-relaxed text-muted-foreground" {...props} />,
  ul: (props) => <ul className="mb-3 ml-5 list-disc space-y-1 text-sm text-muted-foreground" {...props} />,
  ol: (props) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-sm text-muted-foreground" {...props} />,
  li: (props) => <li className="text-sm text-muted-foreground" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  a: ({ href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      {...props}
    />
  ),
  table: (props) => <table className="mb-3 w-full border-collapse text-sm" {...props} />,
  th: (props) => <th className="border border-border/60 bg-accent/50 p-2 text-left text-xs font-semibold text-foreground" {...props} />,
  td: (props) => <td className="border border-border/60 p-2 text-muted-foreground" {...props} />,
};

export default markdownComponents;
