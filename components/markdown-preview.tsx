function stripNofollowFromHtml(html: string) {
  return html.replace(/\srel=(["'])(.*?)\1/gi, (_match, quote, value) => {
    const cleaned = String(value)
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token.toLowerCase() !== 'nofollow');

    return cleaned.length ? ` rel=${quote}${cleaned.join(' ')}${quote}` : '';
  });
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div
      className="journal-prose prose prose-lg max-w-none prose-p:leading-8 prose-p:my-4 prose-headings:tracking-tight prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-3xl prose-h2:font-semibold prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-2xl prose-h3:font-semibold prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:my-5 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-a:text-brand-700 prose-a:underline prose-strong:text-slate-900"
      dangerouslySetInnerHTML={{ __html: stripNofollowFromHtml(content || '') }}
    />
  );
}