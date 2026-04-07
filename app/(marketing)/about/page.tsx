import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Northfield Journal and the kind of education coverage it publishes.'
};

export default function AboutPage() {
  return (
    <div className="container-shell py-14">
      <div className="mx-auto max-w-4xl paper p-8 sm:p-10">
        <span className="eyebrow">About the publication</span>
        <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">Northfield Journal exists for people who want education coverage with some texture.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          This template is positioned like an independent education publication rather than a generic content site. That matters, because trust, editorial taste,
          and perceived quality affect both reader loyalty and monetization.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-stone-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">What we publish</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Student success strategies, teaching craft, school leadership, thoughtful edtech coverage, scholarship advice, and nuanced education commentary.
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-stone-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">What we avoid</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Thin listicles, anonymous keyword sludge, overpromotional guest posts, and articles that sound like they were generated for search robots alone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
