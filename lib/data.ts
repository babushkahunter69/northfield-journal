import { cache } from 'react';
import { siteConfig } from '@/lib/constants';
import { getSiteUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase-server';
import type { Author, Post } from '@/lib/types';
import { getNorthfieldAuthorAssignment } from '@/lib/seo-authors';


function absoluteUrl(value?: string | null) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  const siteUrl = getSiteUrl().replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl}${path}`;
}

function getPostImageUrl(post: Pick<Post, 'featured_image_url' | 'og_image_url'>) {
  return (
    absoluteUrl(post.featured_image_url) ||
    absoluteUrl(post.og_image_url) ||
    absoluteUrl('/opengraph-image')
  );
}

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

function isEditorialAuthor(name?: string | null) {
  if (!name) return true;

  const normalized = name.toLowerCase();

  return (
    normalized.includes('editorial') ||
    normalized.includes('northfield journal') ||
    normalized.includes('journal desk') ||
    normalized.includes('admin')
  );
}

function resolvePostAuthor(
  post: Pick<Post, 'author_name' | 'author_bio' | 'published_at' | 'categories' | 'title' | 'excerpt' | 'content' | 'keywords'>
): Author {
  const assignment = getNorthfieldAuthorAssignment({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.categories?.name,
    primaryKeyword: Array.isArray(post.keywords) ? String(post.keywords[0] || '') : '',
    keyword: Array.isArray(post.keywords) ? String(post.keywords.join(' ')) : ''
  });

  const topicAuthor = assignment.author;
  // Northfield author assignment is deterministic and topic-based.
  // Stored DB authors are treated as stale display data and never override
  // keyword/content routing.
  const resolvedAuthor = topicAuthor;

  return {
    name: resolvedAuthor.name,
    slug: normalizeSlug(resolvedAuthor.name),
    bio: resolvedAuthor.bio,
    avatarInitials: resolvedAuthor.initials || getAuthorInitials(resolvedAuthor.name),
    latestPublishedAt: post.published_at ?? null
  };
}

export function buildAuthorFromPost(
  post: Pick<Post, 'author_name' | 'author_bio' | 'published_at' | 'categories' | 'title' | 'excerpt' | 'content' | 'keywords'>
): Author {
  return resolvePostAuthor(post);
}

function attachAuthorToPost<T extends Post>(post: T): T {
  const author = buildAuthorFromPost(post);

  return {
    ...post,
    author_name: author.name,
    author_bio: author.bio,
    author
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
    const author = buildAuthorFromPost(post);
    const slug = author.slug;
    const existing = authorMap.get(slug);

    if (!existing) {
      authorMap.set(slug, {
        ...author,
        articleCount: 1,
        latestPublishedAt: post.published_at ?? null
      });
      continue;
    }

    existing.articleCount = (existing.articleCount ?? 0) + 1;

    if (!existing.bio && author.bio) {
      existing.bio = author.bio;
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

  return posts.filter((post) => buildAuthorFromPost(post).slug === normalizedSlug);
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
      buildAuthorFromPost(candidate).slug === buildAuthorFromPost(post).slug &&
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
  const post = await getPostBySlug(slug);
  if (!post) return null;

  const siteUrl = getSiteUrl();
  const author = buildAuthorFromPost(post);
  const articleUrl = `${siteUrl}/blog/${post.slug}`;
  const fallbackAuthor = getNorthfieldAuthorAssignment({ title: post.title, excerpt: post.excerpt, content: post.content, category: post.categories?.name, primaryKeyword: Array.isArray(post.keywords) ? String(post.keywords[0] || '') : '' }).author;

  const rawFaqs = Array.isArray(post.faq_json) ? post.faq_json : [];
  const faqs =
    rawFaqs.length > 0
      ? rawFaqs
      : [
          {
            question: 'Who is this article for?',
            answer:
              'This article is written for students, educators, families, and academic readers looking for clear, practical education guidance.',
          },
          {
            question: 'How is Northfield Journal content reviewed?',
            answer:
              'Northfield Journal content is edited for clarity, usefulness, topical relevance, and practical value for education-focused readers.',
          },
        ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: siteConfig.name,
        url: siteUrl,
        description: siteConfig.description,
      },
      {
        '@type': 'Person',
        '@id': `${siteUrl}/authors/${author.slug}#person`,
        name: author.name,
        url: `${siteUrl}/authors/${author.slug}`,
        description: author.bio || undefined,
        jobTitle:
          author.name === 'Emily Carter'
            ? 'Learning Specialist'
            : author.name === 'Mark Reyes'
              ? 'Academic Skills Coach'
              : 'Education Contributor',
        worksFor: {
          '@id': `${siteUrl}/#organization`,
        },
        knowsAbout: [
          'Study skills',
          'Learning methods',
          'Academic writing',
          'Student success',
          'Education strategy',
        ],
      },
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: post.title,
        description: post.meta_description || post.excerpt,
        image: getPostImageUrl(post) ? [getPostImageUrl(post)!] : undefined,
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        author: {
          '@id': `${siteUrl}/authors/${author.slug}#person`,
        },
        reviewedBy: {
          '@type': 'Organization',
          name: fallbackAuthor.reviewerName,
          description: fallbackAuthor.reviewerBio,
        },
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': articleUrl,
        },
        articleSection: post.categories?.name || siteConfig.primaryTopic,
        keywords: post.keywords || siteConfig.defaultKeywords,
      },
      {
        '@type': 'FAQPage',
        '@id': `${articleUrl}#faq`,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${articleUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Journal',
            item: `${siteUrl}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: articleUrl,
          },
        ],
      },
    ],
  };
}
