import { NextResponse } from 'next/server'
import { isCookieAdmin } from '@/lib/admin-auth'
import OpenAI from 'openai'
import { getPublishReadiness } from '@/lib/seo/publish-readiness'

// 👉 adjust to your DB
import { prisma as db } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: Request) {
  const allowed = await isCookieAdmin()

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const id = String(body?.id || '').trim()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const post = await db.post.findUnique({ where: { id } })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const readiness = getPublishReadiness(post)

    if (readiness.status === 'ready') {
      return NextResponse.json({ success: true, message: 'Already ready' })
    }

    const instructions: string[] = []

    if (readiness.wordCount < 900) {
      instructions.push('Expand to 1200+ words with useful content.')
    }

    if (readiness.faqCount < 4) {
      instructions.push('Add at least 5 strong FAQs at the end.')
    }

    if (!post.meta_title || post.meta_title.length < 35) {
      instructions.push('Rewrite SEO title (50-60 chars).')
    }

    if (!post.meta_description || post.meta_description.length < 120) {
      instructions.push('Rewrite meta description (140-160 chars).')
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO editor. Improve content without fluff.',
        },
        {
          role: 'user',
          content: `
Fix this article:

${instructions.join('\n')}

Return JSON ONLY:
{
  "content": "...",
  "meta_title": "...",
  "meta_description": "...",
  "faq_json": [...]
}

ARTICLE:
${post.content}
          `,
        },
      ],
    })

    const text = completion.choices[0].message.content || '{}'

    let parsed: any = {}
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })
    }

    await db.post.update({
      where: { id },
      data: {
        content: parsed.content || post.content,
        meta_title: parsed.meta_title || post.meta_title,
        meta_description: parsed.meta_description || post.meta_description,
        faq_json: parsed.faq_json || post.faq_json,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to auto-fix' }, { status: 500 })
  }
}