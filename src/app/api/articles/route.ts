import { NextResponse } from 'next/server'
import slugify from 'slugify'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json(
      { error: 'Title and content are required' },
      { status: 400 }
    )
  }

  const draftSlug = `${slugify(body.title, { lower: true, strict: true })}-${Date.now()}`

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: body.title.trim(),
      excerpt: body.excerpt?.trim() || null,
      content: body.content,
      cover_image_url: body.cover_image_url?.trim() || null,
      category: body.category?.trim() || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      seo_title: body.seo_title?.trim() || null,
      seo_description: body.seo_description?.trim() || null,
      canonical_url: body.canonical_url?.trim() || null,
      og_image_url: body.og_image_url?.trim() || null,
      slug: draftSlug,
      author_id: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ article: data })
}