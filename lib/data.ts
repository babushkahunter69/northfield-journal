import { cache } from 'react';
import { siteConfig } from '@/lib/constants';
import { getSiteUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase-server';

export const getPublishedPosts = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, categories(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
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
  return data ?? [];
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
  return data ?? [];
});

export const getPostBySlug = cache(async (slug: string) => {
  const supabase = await createClient();

  const normalizedSlug = slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

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

  return data;
});

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data ?? [];
});

export async function getStructuredDataForPost(slug: string) {
  const post = await getPostBySlug(slug);
  if (!post) return null;

  const siteUrl = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.featured_image_url ? [post.featured_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      '@type': 'Person',
      name: post.author_name
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteUrl
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`
  };
}