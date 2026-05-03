import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type RichContentProps = {
  content: string
  className?: string
}

function looksLikeHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content)
}

function hasHeading(content: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\n)#{2,3}\\s+${escaped}\\s*($|\\n)`, 'i').test(content)
}

function enhanceMarkdownContent(content: string) {
  let enhanced = content?.trim() || ''

  if (!enhanced) return enhanced

  if (!hasHeading(enhanced, 'Key Takeaways')) {
    enhanced =
      `## Key Takeaways

- This guide is designed to be practical, clear, and useful for students, educators, or families.
- The recommendations should be adapted to the reader’s academic context, age, goals, and learning needs.
- Strong learning outcomes usually come from consistent systems, not one-time motivation.

` + enhanced
  }

  if (!hasHeading(enhanced, 'FAQ')) {
    enhanced += `

## FAQ

### Who is this guide for?

This guide is written for readers who want practical, plain-English education guidance they can apply in real academic settings.

### How should I use this advice?

Use the ideas as a starting point, then adapt them to the learner, classroom, school, or family context.

### Is this article based on editorial review?

Northfield Journal content is edited for clarity, usefulness, and relevance to students, educators, and academic readers.
`
  }

  if (!hasHeading(enhanced, 'Sources')) {
    enhanced += `

## Sources

- Add credible education research, university resources, government data, classroom examples, or expert references here.
`
  }

  return enhanced
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
    className,
  ].join(' ')

  if (!content?.trim()) {
    return (
      <div className={proseClassName}>
        <p>Nothing to preview yet.</p>
      </div>
    )
  }

  if (looksLikeHtml(content)) {
    return (
      <div className="overflow-x-auto">
        <div
          className={proseClassName}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    )
  }

  const enhancedContent = enhanceMarkdownContent(content)

  return (
    <div className="overflow-x-auto">
      <div className={proseClassName}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <table className="my-8 w-full border-collapse overflow-hidden rounded-xl border border-slate-300 text-left text-base">
                {children}
              </table>
            ),
            thead: ({ children }) => (
              <thead className="bg-stone-100">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-slate-200">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="border border-slate-300 px-4 py-3 align-top font-semibold text-slate-900">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-slate-300 px-4 py-3 align-top">
                {children}
              </td>
            ),
          }}
        >
          {enhancedContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}