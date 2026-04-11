'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DeletePostButton } from '@/components/admin/delete-post-button';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  author_name: string;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string | null;
  categories: { name: string }[] | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
}

export function PostsTable({ posts }: { posts: PostRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(posts.map((post) => post.categories?.[0]?.name).filter(Boolean))
    ) as string[];

    return values.sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const categoryName = post.categories?.[0]?.name || '';
      const matchesQuery =
        !normalizedQuery ||
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.slug.toLowerCase().includes(normalizedQuery) ||
        post.author_name.toLowerCase().includes(normalizedQuery) ||
        categoryName.toLowerCase().includes(normalizedQuery);

      const matchesStatus = status === 'all' || post.status === status;
      const matchesCategory =
        category === 'all' || categoryName === category;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [posts, query, status, category]);

  const publishedCount = posts.filter((post) => post.status === 'published').length;
  const draftCount = posts.filter((post) => post.status === 'draft').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">
            Publishing
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-[#0f172a]">
            All Posts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
            Manage your articles, jump into edits quickly, and keep publishing simple.
          </p>
        </div>

        <Link
          href="/admin/posts/new"
          className="inline-flex items-center rounded-2xl bg-[#e0bb42] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:brightness-105"
        >
          + New Post
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Posts" value={String(posts.length)} />
        <StatCard label="Published" value={String(publishedCount)} />
        <StatCard label="Drafts" value={String(draftCount)} />
      </div>

      <div className="paper p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Search
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, slug, author, or category"
              className="w-full rounded-2xl border border-[#d6cebf] bg-[#fffdfa] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'all' | 'draft' | 'published')
              }
              className="w-full rounded-2xl border border-[#d6cebf] bg-[#fffdfa] px-4 py-3 text-slate-800 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-[#d6cebf] bg-[#fffdfa] px-4 py-3 text-slate-800 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            Showing <span className="font-semibold text-slate-700">{filteredPosts.length}</span>{' '}
            of <span className="font-semibold text-slate-700">{posts.length}</span> posts
          </p>

          {(query || status !== 'all' || category !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatus('all');
                setCategory('all');
              }}
              className="rounded-full border border-[#d9cfbf] px-4 py-2 font-semibold text-slate-700 transition hover:bg-white"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-[#e7dfd2] bg-[#f8f3ea]">
              <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-6 py-5">Title</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Author</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPosts.map((post) => {
                const categoryName = post.categories?.[0]?.name || '—';
                const liveHref = `/blog/${post.slug}`;
                const editHref = `/admin/posts/${post.id}/edit`;

                return (
                  <tr
                    key={post.id}
                    className="border-b border-[#efe7da] last:border-b-0 hover:bg-[#fcfaf5]"
                  >
                    <td className="px-6 py-5">
                      <div className="max-w-[420px]">
                        <p className="truncate text-base font-medium text-[#0f172a]">
                          {post.title}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          /blog/{post.slug}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {categoryName}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {post.author_name}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          post.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {post.status === 'published' ? 'Live' : 'Draft'}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-500">
                      {formatDate(post.published_at || post.updated_at)}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={editHref}
                          className="rounded-full border border-[#d9cfbf] px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                          Edit
                        </Link>

                        <Link
                          href={liveHref}
                          target="_blank"
                          className="rounded-full border border-[#d9cfbf] px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                          View
                        </Link>

                        <DeletePostButton postId={post.id} compact />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredPosts.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto max-w-md">
                      <h3 className="font-serif text-2xl font-semibold text-[#0f172a]">
                        No posts found
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        Try changing your search or filters. You can also create a new
                        post to get started.
                      </p>
                      <Link
                        href="/admin/posts/new"
                        className="mt-5 inline-flex rounded-2xl bg-[#0f1b3d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#16254f]"
                      >
                        Create New Post
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold text-[#0f172a]">
        {value}
      </p>
    </div>
  );
}