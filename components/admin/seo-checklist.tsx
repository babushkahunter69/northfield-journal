import { evaluateEditorialScore } from '@/lib/admin/editorial-score';

type Props = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl?: string | null;
  primaryKeyword?: string | null;
};

type Check = ReturnType<typeof evaluateEditorialScore>['checks'][number];

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
          {check.detail ? (
            <p className="mt-1 text-sm text-slate-400">{check.detail}</p>
          ) : null}
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
  featuredImageUrl,
  primaryKeyword
}: Props) {
  const result = evaluateEditorialScore({
    title,
    excerpt,
    content,
    metaTitle,
    metaDescription,
    featuredImageUrl,
    primaryKeyword
  });

  return (
    <div className="space-y-4 rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6730]">
            SEO Checklist
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold leading-none text-slate-900">
            Editorial score
          </h3>
        </div>

        <div className="rounded-[22px] border border-[#e3c26b] bg-[#fff8eb] px-5 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6730]">
            Score
          </p>
          <p className="mt-2 text-4xl font-semibold text-[#b55c12]">{result.score}</p>
        </div>
      </div>

      <div className="space-y-3">
        {result.checks.map((check) => (
          <CheckItem key={check.key} check={check} />
        ))}
      </div>

      <div className="rounded-[20px] border border-[#e2d9cb] bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Quick stats</p>
        <div className="mt-3 space-y-2 text-sm text-slate-500">
          <p>Word count: {result.stats.wordCount}</p>
          <p>Internal links: {result.stats.internalLinks}</p>
          <p>Section headings: {result.stats.headings}</p>
          <p>FAQ items: {result.stats.faqHeadings}</p>
        </div>
      </div>
    </div>
  );
}
