import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { AdSenseSlot } from '@/components/adsense-slot';
import { NewsletterForm } from '@/components/newsletter-form';
import { getCategories, getPublishedPosts } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Browse premium education articles on student success, teaching craft, school leadership, and academic writing.'
};

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getPublishedPosts(),
    getCategories()
  ]);

  const leadPost = posts[0];
  const restPosts = posts.slice(1);

  return (
    <div className="container-shell py-14">
      {/* HEADER */}
      <div className="max-w-4xl">
        <span className="eyebrow">Journal archive</span>
        <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">
          Essays, ideas, and practical writing on education
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Thoughtful articles for students, educators, and readers who want useful insight without noise.
        </p>
      </div>

      {/* CATEGORY PILLS */}
      <div className="mt-8 flex flex-wrap gap-3">
        {categories.map((category) => (
          <span
            key={category.id}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {category.name}
          </span>
        ))}
      </div>

      {/* FEATURED LEAD */}
      {leadPost ? (
        <div className="mt-12">
          <PostCard post={leadPost} variant="featured" />
        </div>
      ) : null}

      {/* ADS */}
      <div className="my-12">
        <AdSenseSlot className="min-h-[120px]" />
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="section-header-row flex items-end justify-between">
            <h2 className="display-font text-3xl font-semibold text-slate-900">
              From the journal
            </h2>

            <Link
              href="/guest-post"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-slate-900"
            >
              Contribute <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {restPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <NewsletterForm />

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              What we publish
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>Clear thinking over surface-level advice</li>
              <li>Strong structure and readable flow</li>
              <li>Real examples, not vague theory</li>
              <li>Thoughtful guest contributions</li>
            </ul>
          </div>

          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              For contributors
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Share practical insight, classroom experience, or ideas that help readers think better.
            </p>
            <Link
              href="/guest-post"
              className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-slate-900"
            >
              Submit an article →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}