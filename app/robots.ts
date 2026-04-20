import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog', '/blog/', '/about', '/authors'],
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/auth',
          '/auth/',
          '/_next/',
          '/*?*'
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}