import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (articleError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwner = article.author_id === user.id
  const isEditor = profile?.role === 'editor' || profile?.role === 'admin'

  if (!isOwner && !isEditor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = {
    title: body.title?.trim() || article.title,
    excerpt:
      typeof body.excerpt === 'string' ? body.excerpt.trim() || null : article.excerpt,
    content: body.content ?? article.content,
    cover_image_url:
      typeof body.cover_image_url === 'string'
        ? body.cover_image_url.trim() || null
        : article.cover_image_url,
    category:
      typeof body.category === 'string' ? body.category.trim() || null : article.category,
    tags: Array.isArray(body.tags) ? body.tags : article.tags,
    seo_title:
      typeof body.seo_title === 'string' ? body.seo_title.trim() || null : article.seo_title,
    seo_description:
      typeof body.seo_description === 'string'
        ? body.seo_description.trim() || null
        : article.seo_description,
    canonical_url:
      typeof body.canonical_url === 'string'
        ? body.canonical_url.trim() || null
        : article.canonical_url,
    og_image_url:
      typeof body.og_image_url === 'string'
        ? body.og_image_url.trim() || null
        : article.og_image_url,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('articles')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('article_revisions').insert({
    article_id: id,
    updated_by: user.id,
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    status: data.status,
  })

  return NextResponse.json({ article: data })
}