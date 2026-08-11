// Shared ReactMarkdown component-override map — renders AI-generated markdown
// (session reports, project summaries) with this app's own Tailwind tokens
// instead of pulling in a typography/prose plugin.
export const markdownComponents = {
  h1: (props) => <h2 className="mb-3 mt-6 break-words text-xl font-bold text-foreground first:mt-0" {...props} />,
  h2: (props) => <h3 className="mb-2 mt-5 break-words text-lg font-semibold text-foreground first:mt-0" {...props} />,
  h3: (props) => <h4 className="mb-2 mt-4 break-words text-base font-semibold text-foreground first:mt-0" {...props} />,
  p: (props) => <p className="mb-3 break-words text-sm leading-relaxed text-muted-foreground" {...props} />,
  ul: (props) => <ul className="mb-3 ml-5 list-disc space-y-1 text-sm text-muted-foreground" {...props} />,
  ol: (props) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-sm text-muted-foreground" {...props} />,
  li: (props) => <li className="text-sm text-muted-foreground" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  a: ({ href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      {...props}
    />
  ),
  table: ({ children }) => (
    <div className="thin-scrollbar mb-3 max-w-full overflow-x-auto rounded-lg border border-border/60">
      <table className="w-max min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: (props) => <th className="border border-border/60 bg-accent/50 p-2 text-left text-xs font-semibold text-foreground" {...props} />,
  td: (props) => <td className="border border-border/60 p-2 text-muted-foreground" {...props} />,
  pre: (props) => <pre className="thin-scrollbar mb-3 max-w-full overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs" {...props} />,
  code: (props) => <code className="break-words rounded bg-muted/70 px-1 py-0.5 text-xs" {...props} />,
};

export default markdownComponents;
