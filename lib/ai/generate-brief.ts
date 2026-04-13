import { makeSlug } from '@/lib/utils';
import { generateJson } from '@/lib/ai/client';
import type { ContentKeyword, GeneratedBrief } from '@/lib/types';

export async function generateBrief(keyword: ContentKeyword): Promise<GeneratedBrief> {
  return generateJson<GeneratedBrief>([
    {
      role: 'system',
      content:
        'You are an editorial strategist for Northfield Journal, an education publication for a Western audience. Return valid JSON only. Avoid hype, fake statistics, and unverifiable claims. Focus on practical, evergreen education content.'
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Create an SEO content brief for one article.',
        niche: 'education',
        brand: 'Northfield Journal',
        country_code: keyword.country_code || 'US',
        keyword: keyword.keyword,
        cluster: keyword.cluster,
        search_intent: keyword.search_intent,
        audience: keyword.audience,
        output_schema: {
          working_title: 'string',
          slug: 'string',
          angle: 'string',
          seo_title: 'string',
          seo_description: 'string',
          target_word_count: 'number',
          secondary_keywords: ['string'],
          outline: [{ heading: 'string', notes: 'string' }],
          faq: [{ question: 'string', answer: 'string' }],
          internal_link_suggestions: ['string'],
          category_slug: 'string'
        }
      })
    }
  ]).then((brief) => ({
    ...brief,
    slug: brief.slug || makeSlug(brief.working_title || keyword.keyword)
  }));
}
