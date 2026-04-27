import { cache } from 'react';
import { siteConfig } from '@/lib/constants';
import { getSiteUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase-server';
import type { Author, Post } from '@/lib/types';

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getAuthorInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'NJ';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function buildAuthorFromPost(
  post: Pick<Post, 'author_name' | 'author_bio' | 'published_at'>
): Author {
  return {
    name: post.author_name,
    slug: normalizeSlug(post.author_name),
    bio: post.author_bio,
    avatarInitials: getAuthorInitials(post.author_name),
    latestPublishedAt: post.published_at ?? null
  };
}

function attachAuthorToPost<T extends Post>(post: T): T {
  return {
    ...post,
    author: buildAuthorFromPost(post)
  };
}

export const getPublishedPosts = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, categories(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((post) => attachAuthorToPost(post as Post));
});

export const getFeaturedPosts = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, categories(*)')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  return (data ?? []).map((post) => attachAuthorToPost(post as Post));
});

export const getLatestPosts = cache(async (limit = 4) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, categories(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((post) => attachAuthorToPost(post as Post));
});

export const getPostBySlug = cache(async (slug: string) => {
  const supabase = await createClient();

  const normalizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');

  const { data, error } = await supabase
    .from('posts')
    .select('*, categories(*)')
    .eq('slug', normalizedSlug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Error fetching post:', error);
    return null;
  }

  return data ? attachAuthorToPost(data as Post) : null;
});

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('*').order('name');

  if (error) throw error;
  return data ?? [];
});

export const getAllAuthors = cache(async (): Promise<Author[]> => {
  const posts = await getPublishedPosts();
  const authorMap = new Map<string, Author>();

  for (const post of posts) {
    const slug = normalizeSlug(post.author_name);
    const existing = authorMap.get(slug);

    if (!existing) {
      authorMap.set(slug, {
        name: post.author_name,
        slug,
        bio: post.author_bio,
        avatarInitials: getAuthorInitials(post.author_name),
        articleCount: 1,
        latestPublishedAt: post.published_at ?? null
      });
      continue;
    }

    existing.articleCount = (existing.articleCount ?? 0) + 1;

    if (!existing.bio && post.author_bio) {
      existing.bio = post.author_bio;
    }

    if (
      post.published_at &&
      (!existing.latestPublishedAt ||
        new Date(post.published_at).getTime() >
          new Date(existing.latestPublishedAt).getTime())
    ) {
      existing.latestPublishedAt = post.published_at;
    }
  }

  return Array.from(authorMap.values()).sort((a, b) => {
    const countDiff = (b.articleCount ?? 0) - (a.articleCount ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.name.localeCompare(b.name);
  });
});

export const getAuthorBySlug = cache(async (slug: string) => {
  const authors = await getAllAuthors();
  return authors.find((author) => author.slug === normalizeSlug(slug)) ?? null;
});

export const getPostsByAuthorSlug = cache(async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);
  const posts = await getPublishedPosts();

  return posts.filter((post) => normalizeSlug(post.author_name) === normalizedSlug);
});

export const getRelatedPostsBySlug = cache(async (slug: string, limit = 3) => {
  const post = await getPostBySlug(slug);
  if (!post) return [];

  const posts = await getPublishedPosts();

  const sameCategory = posts.filter(
    (candidate) =>
      candidate.slug !== post.slug &&
      candidate.category_id &&
      post.category_id &&
      candidate.category_id === post.category_id
  );

  const sameAuthor = posts.filter(
    (candidate) =>
      candidate.slug !== post.slug &&
      normalizeSlug(candidate.author_name) === normalizeSlug(post.author_name) &&
      !sameCategory.some((item) => item.slug === candidate.slug)
  );

  const fallback = posts.filter(
    (candidate) =>
      candidate.slug !== post.slug &&
      !sameCategory.some((item) => item.slug === candidate.slug) &&
      !sameAuthor.some((item) => item.slug === candidate.slug)
  );

  return [...sameCategory, ...sameAuthor, ...fallback].slice(0, limit);
});

export async function getStructuredDataForPost(slug: string) {
  const post = await getPostBySlug(slug)
  if (!post) return null

  const siteUrl = getSiteUrl()
  const authorSlug = normalizeSlug(post.author_name)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${siteUrl}/blog/${post.slug}#article`,
        headline: post.title,
        description: post.meta_description || post.excerpt,
        image: post.featured_image_url ? [post.featured_image_url] : undefined,
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        author: {
          '@type': 'Person',
          '@id': `${siteUrl}/authors/${authorSlug}#person`,
          name: post.author_name,
          url: `${siteUrl}/authors/${authorSlug}`,
          description: post.author_bio || undefined,
          worksFor: {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteUrl,
          },
        },
        publisher: {
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: siteConfig.name,
          url: siteUrl,
          description: siteConfig.description,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteUrl}/blog/${post.slug}`,
        },
        articleSection: post.categories?.name || siteConfig.primaryTopic,
        keywords: post.keywords || siteConfig.defaultKeywords,
      },
      {
        '@type': 'FAQPage',
        '@id': `${siteUrl}/blog/${post.slug}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Who is this article for?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'This article is written for students, educators, families, and academic readers looking for clear, practical education guidance.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is Northfield Journal content reviewed?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Northfield Journal content is edited for clarity, usefulness, topical relevance, and practical value for education-focused readers.',
            },
          },
        ],
      },
    ],
  }
}