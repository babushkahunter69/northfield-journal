export type ReadinessStatus = 'ready' | 'needs_review' | 'failed'

export function getPublishReadiness(post: any) {
  const blockers: string[] = []
  const warnings: string[] = []

  // FAQ COUNT
  let faqCount = 0
  try {
    if (Array.isArray(post.faq_json)) {
      faqCount = post.faq_json.length
    } else if (post.faq_json) {
      faqCount = JSON.parse(post.faq_json).length
    }
  } catch {
    faqCount = 0
  }

  // WORD COUNT
  const wordCount = post.content
    ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
    : 0

  // RULES
  if (wordCount < 900) blockers.push(`Too short (${wordCount} words)`)
  if (faqCount < 4) blockers.push(`Not enough FAQs (${faqCount})`)
  if (!post.featured_image_url && !post.og_image_url) blockers.push('Missing image')
  if (!post.meta_title || post.meta_title.length < 35) blockers.push('Weak title')

  if (!post.meta_description || post.meta_description.length < 120) {
    warnings.push('Weak meta description')
  }

  return {
    status: blockers.length > 0
      ? 'failed'
      : warnings.length > 0
        ? 'needs_review'
        : 'ready',
    blockers,
    warnings,
    wordCount,
    faqCount,
  }
}