type PostPreviewProps = {
  title: string;
  excerpt: string;
  content: string;
};

export function PostPreview({ title, excerpt, content }: PostPreviewProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e2d9cb] bg-[#fffdf9] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[#e2d9cb] bg-[#f8f3ea] px-4 py-3 text-sm font-semibold text-slate-600">
        Article Preview
      </div>

      <div className="bg-white px-8 py-10">
        <article className="article-page mx-auto max-w-3xl">
          <div className="journal-prose prose prose-lg max-w-none prose-p:my-5 prose-p:leading-9 prose-headings:tracking-tight prose-h2:mb-5 prose-h2:mt-12 prose-h2:text-3xl prose-h2:font-semibold prose-h3:mb-4 prose-h3:mt-8 prose-h3:text-2xl prose-h3:font-semibold prose-ul:my-6 prose-ol:my-6 prose-li:my-1 prose-blockquote:my-7 prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-a:text-brand-700 prose-a:underline prose-strong:text-slate-900">
            <h1 className="display-font text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {title || 'Untitled article'}
            </h1>

            {excerpt ? (
              <p className="mt-5 max-w-3xl text-xl leading-9 text-slate-600">{excerpt}</p>
            ) : null}

            <div
              className="mt-8"
              dangerouslySetInnerHTML={{
                __html: content || '<p>Nothing to preview yet.</p>'
              }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}