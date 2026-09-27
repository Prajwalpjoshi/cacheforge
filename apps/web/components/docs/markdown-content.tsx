import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";

/**
 * Hand-styled overrides instead of a Tailwind typography plugin, so
 * headings/code/tables match the dark-first design tokens exactly
 * rather than the plugin's own defaults.
 */
const COMPONENTS: Components = {
  h1: (props) => (
    <h1
      className="mt-8 text-2xl font-semibold text-foreground first:mt-0"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-8 border-b border-border pb-2 text-lg font-semibold text-foreground"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-6 text-base font-semibold text-foreground" {...props} />
  ),
  p: (props) => <p className="mt-3 text-sm leading-7 text-muted" {...props} />,
  a: (props) => <a className="text-accent hover:underline" {...props} />,
  ul: (props) => (
    <ul
      className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted"
      {...props}
    />
  ),
  li: (props) => <li className="leading-6" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mt-3 border-l-2 border-accent/40 pl-4 text-sm italic text-muted"
      {...props}
    />
  ),
  code: ({ className, ...props }) =>
    className ? (
      <code className={`${className} font-mono text-xs`} {...props} />
    ) : (
      <code
        className="break-words rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-foreground"
        {...props}
      />
    ),
  pre: (props) => (
    <pre
      className="mt-3 overflow-x-auto rounded-md border border-border bg-surface-raised p-3 font-mono text-xs text-foreground"
      {...props}
    />
  ),
  table: (props) => (
    <div className="mt-3 w-full overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="border-b border-border" {...props} />,
  th: (props) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border-b border-border/60 px-3 py-2 text-muted" {...props} />
  ),
  hr: (props) => <hr className="my-8 border-border" {...props} />,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
