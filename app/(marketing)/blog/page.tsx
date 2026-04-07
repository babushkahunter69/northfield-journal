import type { Metadata } from 'next';
import { PostCard } from '@/components/post-card';
import { AdSenseSlot } from '@/components/adsense-slot';
import { NewsletterForm } from '@/components/newsletter-form';
import { getCategories, getPublishedPosts } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Browse essays, commentary, and practical writing on learning, teaching, and education.'
};

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getPublishedPosts(),
    getCategories()
  ]);

  return (
    <div className="container-shell py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <span className="eyebrow">Journal archive</span>
          <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">
            Essays, ideas, and practical writing on education
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Thoughtful articles for students, educators, and readers who want
            useful insight without jargon, hype, or filler.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
              >
                {category.name}
              </span>
            ))}
          </div>

          <div className="my-10">
            <AdSenseSlot className="min-h-[120px]" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <NewsletterForm />
          <div className="paper p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              What we publish
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>Clear, practical ideas over generic advice</li>
              <li>Well-structured articles that are easy to read</li>
              <li>Thoughtful perspectives from real practitioners</li>
              <li>Guest contributions reviewed before publication</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}