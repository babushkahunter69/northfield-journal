type Props = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl?: string | null;
};

type Check = {
  label: string;
  passed: boolean;
  hint?: string;
};

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function hasInternalLinks(html: string) {
  return /href="\/blog\/[^"]+"/i.test(html);
}

function hasFaqSection(html: string) {
  return (
    /<h2[^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h2>/i.test(html) ||
    /<h3[^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h3>/i.test(html) ||
    /<h4[^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h4>/i.test(html)
  );
}

function CheckItem({ check }: { check: Check }) {
  return (
    <div className="rounded-[20px] border border-[#e2d9cb] bg-[#fffdf8] p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            check.passed
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {check.passed ? '✓' : '!'}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{check.label}</p>
          {!check.passed && check.hint ? (
            <p className="mt-1 text-sm text-slate-500">{check.hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SeoChecklist({
  title,
  excerpt,
  content,
  metaTitle,
  metaDescription,
  featuredImageUrl
}: Props) {
  const wordCount = countWords(content);

  const checks: Check[] = [
    {
      label: 'Title exists',
      passed: Boolean(title?.trim())
    },
    {
      label: 'Title length looks healthy',
      passed: title.trim().length >= 35 && title.trim().length <= 70,
      hint: 'Aim for 35–70 characters.'
    },
    {
      label: 'Excerpt exists',
      passed: Boolean(excerpt?.trim())
    },
    {
      label: 'Meta title length looks healthy',
      passed: metaTitle.trim().length >= 40 && metaTitle.trim().length <= 65,
      hint: 'Aim for 40–65 characters.'
    },
    {
      label: 'Meta description length looks healthy',
      passed:
        metaDescription.trim().length >= 120 &&
        metaDescription.trim().length <= 160,
      hint: 'Aim for 120–160 characters.'
    },
    {
      label: 'Content is substantial',
      passed: wordCount >= 900,
      hint: 'Aim for at least 900 words.'
    },
    {
      label: 'Has internal links',
      passed: hasInternalLinks(content),
      hint: 'Add 1–3 internal links.'
    },
    {
      label: 'Has FAQ section',
      passed: hasFaqSection(content),
      hint: 'Add a short FAQ section.'
    },
    {
      label: 'Has featured image',
      passed: Boolean(featuredImageUrl)
    }
  ];

  return (
    <div className="space-y-4 rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6730]">
          SEO Checklist
        </p>
      </div>

      <div className="space-y-3">
        {checks.map((check) => (
          <CheckItem key={check.label} check={check} />
        ))}
      </div>

      <div className="rounded-[20px] border border-[#e2d9cb] bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Quick stats</p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>Word count: {wordCount}</p>
          <p>Meta title: {metaTitle.trim().length} chars</p>
          <p>Meta description: {metaDescription.trim().length} chars</p>
        </div>
      </div>
    </div>
  );
}