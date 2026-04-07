import Link from 'next/link';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChartColumn, Newspaper, PenSquare, Sparkles } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { AdSenseSlot } from '@/components/adsense-slot';
import { NewsletterForm } from '@/components/newsletter-form';
import { editorialPillars, monetizationChannels, siteConfig } from '@/lib/constants';
import { getFeaturedPosts, getLatestPosts, getPublishedPosts } from '@/lib/data';

const highlights = [
  { title: 'Reported and useful', description: 'Built to feel like a publication, not a thin affiliate blog.', icon: Newspaper },
  { title: 'Editorial intake', description: 'Accept guest drafts and manage approvals in an admin dashboard.', icon: PenSquare },
  { title: 'Organic search ready', description: 'Metadata, structured data, sitemap, internal linking, and article pages are already in place.', icon: ChartColumn },
  { title: 'Monetization paths', description: 'Ads, sponsors, affiliates, and email capture are all supported.', icon: BriefcaseBusiness }
];

export default async function HomePage() {
  const [featuredPosts, latestPosts, allPosts] = await Promise.all([
    getFeaturedPosts(),
    getLatestPosts(4),
    getPublishedPosts()
  ]);

  return (
    <div>
      <section className="container-shell pt-10 sm:pt-14">
        <div className="paper overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <span className="eyebrow">Luxury editorial identity</span>
              <h1 className="display-font mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                A smarter education publication with a custom brand system and a real editor’s desk.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                This version adds a warmer luxury palette, custom wordmark treatment, featured image uploads, an actual CMS workflow,
                and polished dark mode readiness without losing SEO or monetization readiness.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/blog" className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700">
                  Read the journal
                </Link>
                <Link href="/admin/editor" className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:border-slate-400">
                  Open CMS editor
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(siteConfig.socialProof).map(([label, value]) => (
                <div key={label} className="rounded-[24px] border border-slate-200 bg-stone-50 p-5">
                  <p className="display-font text-4xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p>
                </div>
              ))}
              <div className="rounded-[24px] border border-brand-200 bg-brand-50 p-5 sm:col-span-2">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                  <Sparkles className="h-4 w-4" />
                  What is new
                </p>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  Richer identity, editable posts, image uploads, premium article cards, and a better night-reading experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="grid gap-6 lg:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="paper p-6">
                <Icon className="h-8 w-8 text-brand-700" />
                <h2 className="mt-5 text-xl font-bold text-slate-900">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-shell py-4">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="eyebrow">Editor’s picks</span>
            <h2 className="display-font mt-5 text-4xl font-semibold tracking-tight text-slate-900">Feature stories with depth, not filler</h2>
            <div className="mt-8 grid gap-6">
              {(featuredPosts.length > 0 ? featuredPosts : latestPosts.slice(0, 3)).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <NewsletterForm />
            <div className="paper p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Coverage areas</p>
              <div className="mt-5 grid gap-4">
                {editorialPillars.map((pillar) => (
                  <div key={pillar.title} className="rounded-2xl border border-slate-200 bg-stone-50 p-4">
                    <h3 className="font-semibold text-slate-900">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-6">
        <AdSenseSlot className="min-h-[120px]" />
      </section>

      <section className="container-shell py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Latest</span>
            <h2 className="display-font mt-5 text-4xl font-semibold tracking-tight text-slate-900">Fresh stories for search and trust</h2>
          </div>
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
            Browse all articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {latestPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <section className="container-shell py-10">
        <div className="paper grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span className="eyebrow">Monetization</span>
            <h2 className="display-font mt-5 text-4xl font-semibold text-slate-900">Designed to monetize once the audience is real</h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
              You do not need to rely on display ads alone. This starter supports the most common revenue channels used by focused media brands.
            </p>
          </div>
          <div className="grid gap-3">
            {monetizationChannels.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-stone-50 px-4 py-4 text-sm text-slate-700">
                <BookOpen className="mt-0.5 h-5 w-5 text-brand-700" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="paper p-7 lg:col-span-2">
            <span className="eyebrow">Identity system</span>
            <h2 className="display-font mt-5 text-4xl font-semibold text-slate-900">Obsidian, parchment, and brass gold.</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              The visual system leans away from startup blues and toward a warmer publication aesthetic, with a monogram mark and serif-led hierarchy.
            </p>
          </div>
          <div className="paper p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Current article inventory</p>
            <p className="display-font mt-4 text-5xl font-semibold text-slate-900">{allPosts.length}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">Seed articles are included, but this will look truly premium once you replace them with your own editorial pieces.</p>
          </div>
        </div>
      </section>
    </div>
  );
}