import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
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

  const { data: article, error } = await supabase
    .from('articles')
    .update({
      status: 'submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('author_id', user.id)
    .select()
    .single()

  if (error || !article) {
    return NextResponse.json(
      { error: error?.message || 'Unable to submit article' },
      { status: 400 }
    )
  }

  await supabase.from('article_revisions').insert({
    article_id: article.id,
    updated_by: user.id,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    status: article.status,
  })

  return NextResponse.json({ article })
}