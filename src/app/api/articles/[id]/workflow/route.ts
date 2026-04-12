import { NextResponse } from 'next/server'
import slugify from 'slugify'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: currentArticle } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!currentArticle) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const action = body.action as
    | 'assign'
    | 'under_review'
    | 'needs_revision'
    | 'reject'
    | 'publish'

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (action === 'assign') update.editor_id = user.id
  if (action === 'under_review') update.status = 'under_review'
  if (action === 'needs_revision') update.status = 'needs_revision'
  if (action === 'reject') update.status = 'rejected'

  if (action === 'publish') {
    update.status = 'published'
    update.published_at = new Date().toISOString()
    update.slug = slugify(currentArticle.title, { lower: true, strict: true })
    update.editor_id = currentArticle.editor_id || user.id
  }

  const { data, error } = await supabase
    .from('articles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Unable to update workflow' },
      { status: 400 }
    )
  }

  await supabase.from('article_revisions').insert({
    article_id: data.id,
    updated_by: user.id,
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    status: data.status,
  })

  return NextResponse.json({ article: data })
}