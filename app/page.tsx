import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  ChartColumn,
  Newspaper,
  PenSquare,
  Sparkles
} from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { AdSenseSlot } from '@/components/adsense-slot';
import { NewsletterForm } from '@/components/newsletter-form';
import { editorialPillars, siteConfig } from '@/lib/constants';
import { getFeaturedPosts, getLatestPosts, getPublishedPosts } from '@/lib/data';

import type { Metadata } from 'next';

const siteUrl = 'https://northfieldjournal.com';
const socialImage = '/opengraph-image';

export const metadata: Metadata = {
  title: 'Northfield Journal',
  description:
    'Thoughtful, practical writing on education, teaching, learning, and school life for students, educators, and academic readers.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Northfield Journal',
    description:
      'Thoughtful, practical writing on education, teaching, learning, and school life for students, educators, and academic readers.',
    url: siteUrl,
    type: 'website',
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: 'Northfield Journal'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Northfield Journal',
    description:
      'Thoughtful, practical writing on education, teaching, learning, and school life for students, educators, and academic readers.',
    images: [socialImage]
  }
};

const highlights = [
  {
    title: 'Thoughtful reporting',
    description: 'Articles built to inform, not just fill space.',
    icon: Newspaper
  },
  {
    title: 'Editorial workflow',
    description: 'Submissions are reviewed, refined, and curated.',
    icon: PenSquare
  },
  {
    title: 'Built for discovery',
    description: 'Structured writing that is easy to read and easy to find.',
    icon: ChartColumn
  },
  {
    title: 'Sustainable publishing',
    description: 'Designed to grow through consistent, high-quality work.',
    icon: BriefcaseBusiness
  }
];

function normalizeLabel(title: string) {
  const value = title.toLowerCase();

  if (
    value.includes('research') ||
    value.includes('study') ||
    value.includes('analysis') ||
    value.includes('data')
  ) {
    return 'Research';
  }

  if (
    value.includes('guide') ||
    value.includes('career') ||
    value.includes('teaching') ||
    value.includes('learning') ||
    value.includes('student')
  ) {
    return 'Guides';
  }

  return 'Subjects';
}

export default async function HomePage() {
  // 🔥 NEW: pull featured post directly from DB
  const { supabaseAdmin } = await import('@/lib/supabase-admin');

  const featuredResponse = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .eq('is_featured_homepage', true)
    .order('published_at', { ascending: false })
    .limit(3);

  const featuredPosts = featuredResponse.data || [];

  // keep your existing queries
  const [latestPosts, allPosts] = await Promise.all([
    getLatestPosts(4),
    getPublishedPosts()
  ]);

  // fallback logic (KEEP THIS — it's good)
  const featuredCollection =
    featuredPosts.length > 0 ? featuredPosts : latestPosts.slice(0, 3);

  const leadPost = featuredCollection[0];
  const supportPosts = featuredCollection.slice(1, 3);
  const latestGridPosts = latestPosts.slice(0, 4);

  return (
    <div className="homepage-editorial">
      <section className="container-shell pt-10 sm:pt-14">
        <div className="paper hero-shell overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <span className="eyebrow">Independent education publication</span>
              <h1 className="display-font mt-6 max-w-4xl text-5xl font-semibold tracking-tight leading-[1.02] text-slate-900 sm:text-6xl lg:text-7xl">
                Thoughtful writing on learning, teaching, and education.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Northfield Journal publishes thoughtful writing for students, educators, and
                academic thinkers. Each piece is meant to be clear, useful, and worth returning to.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/blog"
                  className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
                >
                  Read the journal
                </Link>
                <Link
                  href="/guest-post"
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:border-slate-400"
                >
                  Share your perspective
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(siteConfig.socialProof).map(([label, value]) => (
                <div key={label} className="hero-stat rounded-[24px] border border-slate-200 bg-stone-50 p-5">
                  <p className="display-font text-4xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">
                    {label.replace(/([A-Z])/g, ' $1')}
                  </p>
                </div>
              ))}
              <div className="hero-note rounded-[24px] border border-brand-200 bg-brand-50 p-5 sm:col-span-2">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                  <Sparkles className="h-4 w-4" />
                  What is new
                </p>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  A refined reading experience, stronger editorial hierarchy, and a cleaner home for
                  ideas worth sharing.
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
              <div key={item.title} className="paper feature-panel p-6">
                <Icon className="h-8 w-8 text-brand-700" />
                <div className="mt-5 flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                    {normalizeLabel(item.title)}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-shell py-4 sm:py-6">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div>
            <div className="section-intro">
              <span className="eyebrow">Editor’s picks</span>
              <h2 className="display-font mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Featured stories
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                A curated selection of pieces chosen for clarity, substance, and lasting relevance.
              </p>
            </div>

            {leadPost ? (
              <div className="mt-8">
                <div className="featured-lead-story">
                  <PostCard post={leadPost} />
                </div>
              </div>
            ) : null}

            {supportPosts.length > 0 ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {supportPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="paper premium-panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                From the editor
              </p>
              <h3 className="display-font mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                Writing that rewards attention.
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                We publish work meant to be useful, revisited, and shared — not just scanned and forgotten.
              </p>
            </div>

            <NewsletterForm />

            <div className="paper p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                Coverage areas
              </p>
              <div className="mt-5 grid gap-4">
                {editorialPillars.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="rounded-2xl border border-slate-200 bg-stone-50 p-4 transition hover:border-slate-300"
                  >
                    <div className="mb-3">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                        {normalizeLabel(pillar.title)}
                      </span>
                    </div>
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
        <div className="section-header-row flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">From the journal</span>
            <h2 className="display-font mt-5 text-4xl font-semibold tracking-tight text-slate-900">
              Latest articles
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              New writing from the journal, selected for clarity, relevance, and depth.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-slate-900"
          >
            Browse all articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {latestGridPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="paper p-7 sm:p-8">
            <span className="eyebrow">About the journal</span>
            <h2 className="display-font mt-5 text-4xl font-semibold text-slate-900">
              Writing that values clarity and substance.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Northfield Journal focuses on ideas that are thoughtful, practical, and grounded in
              real experience. We prioritize work that readers can return to, not just scroll past.
            </p>
          </div>

          <div className="paper p-7 sm:p-8">
            <span className="eyebrow">Contribute</span>
            <h2 className="display-font mt-5 text-4xl font-semibold text-slate-900">
              Share ideas that help readers think better.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              We welcome clear, grounded writing from educators, tutors, researchers, and thoughtful
              contributors with something real to say.
            </p>
            <div className="mt-6">
              <Link
                href="/guest-post"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-slate-900"
              >
                Submit an article <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell pb-14">
        <div className="paper p-7 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="eyebrow">Current inventory</span>
              <p className="display-font mt-4 text-5xl font-semibold text-slate-900">{allPosts.length}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Articles currently published in the journal.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Students</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Study skills, learning habits, and thoughtful academic guidance.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Educators</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Teaching craft, classroom insight, and ideas worth applying.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Contributors</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  A home for practical, well-edited writing with lasting value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}