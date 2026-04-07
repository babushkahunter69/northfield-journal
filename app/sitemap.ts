import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/lib/data';
import { getSiteUrl } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const posts = await getPublishedPosts();

  const staticRoutes: MetadataRoute.Sitemap = ['', '/blog', '/guest-post', '/about', '/contact', '/privacy-policy', '/terms'].map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
    lastModified: new Date()
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.published_at ? new Date(post.published_at) : new Date(post.created_at),
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  return [...staticRoutes, ...postRoutes];
}
