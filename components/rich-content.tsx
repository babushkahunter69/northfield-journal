import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type RichContentProps = {
  content: string;
  className?: string;
};

const STATIC_INTERNAL_PATHS = new Set(['/', '/journal', '/about', '/contact', '/guest-post', '/contribute']);

function looksLikeHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function normalizeContent(content: string) {
  return String(content || '')
    .replace(/^#\s+/gim, '## ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeHref(value: unknown) {
  const href = String(value || '').trim();
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(href)) return href;
  if (STATIC_INTERNAL_PATHS.has(href)) return href;
  return '';
}

function stripKnownBadRenderedText(content: string) {
  return String(content || '')
    .replace(/(?:Related reading|Recommended reading|Further reading):\s*[^\n.]+(?:\.|\n|$)/gi, '')
    .replace(/For more (?:advice|guidance|support)[^\n.]*?(?:see|explore)[^\n.]+(?:\.|\n|$)/gi, '')
    .replace(/[^.!?]*\b(?:building motivation in students|effective parent-teacher communication|time management for students|effective study habits)\b[^.!?]*[.!?]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function RichContent({ content, className = '' }: RichContentProps) {
  const proseClassName = [
    'journal-prose prose prose-lg max-w-none',
    'prose-p:my-5 prose-p:leading-9',
    'prose-headings:tracking-tight',
    'prose-h1:text-4xl prose-h1:font-semibold prose-h1:mb-6',
    'prose-h2:mb-5 prose-h2:mt-12 prose-h2:text-3xl prose-h2:font-semibold',
    'prose-h3:mb-4 prose-h3:mt-8 prose-h3:text-2xl prose-h3:font-semibold',
    'prose-ul:my-6 prose-ol:my-6 prose-li:my-1',
    'prose-blockquote:my-7 prose-blockquote:border-l-4 prose-blockquote:pl-5',
    'prose-a:text-brand-700 prose-a:underline',
    'prose-strong:text-slate-900',
    'dark:prose-p:text-slate-200',
    'dark:prose-li:text-slate-200',
    'dark:prose-strong:text-white',
    'dark:prose-headings:text-white',
    'dark:prose-a:text-amber-400',
    '[&>*:first-child]:mt-0',
    '[&>*:last-child]:mb-0',
    className
  ].join(' ');

  if (!content?.trim()) {
    return (
      <div className={proseClassName}>
        <p>Nothing to preview yet.</p>
      </div>
    );
  }

  const cleanContent = stripKnownBadRenderedText(normalizeContent(content));

  if (looksLikeHtml(cleanContent)) {
    return (
      <div className="overflow-x-auto">
        <div className={proseClassName} dangerouslySetInnerHTML={{ __html: cleanContent }} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className={proseClassName}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              const safe = safeHref(href);
              if (!safe) return <span>{children}</span>;
              return <a href={safe}>{children}</a>;
            },
            table: ({ children }) => (
              <table className="my-8 w-full border-collapse overflow-hidden rounded-xl border border-slate-300 text-left text-base">
                {children}
              </table>
            ),
            thead: ({ children }) => <thead className="bg-stone-100">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
            th: ({ children }) => (
              <th className="border border-slate-300 px-4 py-3 align-top font-semibold text-slate-900">
                {children}
              </th>
            ),
            td: ({ children }) => <td className="border border-slate-300 px-4 py-3 align-top">{children}</td>
          }}
        >
          {cleanContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
