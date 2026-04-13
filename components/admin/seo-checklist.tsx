type SeoChecklistProps = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImageUrl?: string | null;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(html: string) {
  const plain = stripHtml(html);
  return plain ? plain.split(' ').filter(Boolean).length : 0;
}

function hasInternalLink(html: string) {
  return /href=["']\/(blog|authors|categories|journal)/i.test(html);
}

function hasFaq(html: string) {
  return /<h2[^>]*>\s*faq\s*<\/h2>|<h3[^>]*>\s*faq\s*<\/h3>/i.test(html);
}

function item(label: string, ok: boolean, hint: string) {
  return { label, ok, hint };
}

export function SeoChecklist({
  title,
  excerpt,
  content,
  metaTitle,
  metaDescription,
  featuredImageUrl
}: SeoChecklistProps) {
  const titleLen = (title || '').trim().length;
  const metaTitleLen = (metaTitle || '').trim().length;
  const metaDescriptionLen = (metaDescription || '').trim().length;
  const words = wordCount(content || '');

  const checks = [
    item('Title exists', !!title.trim(), 'Add a clear article title.'),
    item('Title length looks healthy', titleLen >= 35 && titleLen <= 70, 'Aim for 35–70 characters.'),
    item('Excerpt exists', !!excerpt.trim(), 'Add a concise summary.'),
    item(
      'Meta title length looks healthy',
      metaTitleLen >= 40 && metaTitleLen <= 65,
      'Aim for 40–65 characters.'
    ),
    item(
      'Meta description length looks healthy',
      metaDescriptionLen >= 120 && metaDescriptionLen <= 160,
      'Aim for 120–160 characters.'
    ),
    item('Content is substantial', words >= 900, 'Aim for at least 900 words.'),
    item('Has internal links', hasInternalLink(content || ''), 'Add 1–3 internal links.'),
    item('Has FAQ section', hasFaq(content || ''), 'Add a short FAQ section.'),
    item('Has featured image', !!featuredImageUrl, 'Generate or upload a cover image.')
  ];

  return (
    <div className="rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">
        SEO Checklist
      </p>

      <div className="mt-4 space-y-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-2xl border border-[#ece3d6] bg-white px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  check.ok
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {check.ok ? '✓' : '!'}
              </span>

              <div>
                <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                {!check.ok ? (
                  <p className="mt-1 text-sm leading-6 text-slate-500">{check.hint}</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#ece3d6] bg-white px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">Quick stats</p>
        <div className="mt-3 space-y-1 text-sm leading-7 text-slate-600">
          <p>Title length: {titleLen}</p>
          <p>Meta title length: {metaTitleLen}</p>
          <p>Meta description length: {metaDescriptionLen}</p>
          <p>Word count: {words}</p>
        </div>
      </div>
    </div>
  );
}