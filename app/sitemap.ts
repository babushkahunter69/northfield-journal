import type { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/data'
import { getSiteUrl } from '@/lib/utils'

function getPostPriority(date?: string) {
  if (!date) return 0.7

  const daysOld =
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)

  if (daysOld <= 2) return 0.9
  if (daysOld <= 7) return 0.85
  if (daysOld <= 30) return 0.75
  return 0.65
}

function getPostFrequency(date?: string): MetadataRoute.Sitemap[number]['changeFrequency'] {
  if (!date) return 'monthly'

  const daysOld =
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)

  if (daysOld <= 7) return 'daily'
  if (daysOld <= 30) return 'weekly'
  return 'monthly'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const posts = await getPublishedPosts()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/guest-post`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => {
    const date = post.published_at || post.created_at

    return {
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: date ? new Date(date) : undefined,
      changeFrequency: getPostFrequency(date),
      priority: getPostPriority(date),
    }
  })

  return [...staticRoutes, ...postRoutes]
}