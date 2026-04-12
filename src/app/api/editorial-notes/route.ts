import { NextResponse } from 'next/server'
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

  if (!body.articleId || !body.body?.trim()) {
    return NextResponse.json(
      { error: 'articleId and body are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('editorial_notes')
    .insert({
      article_id: body.articleId,
      author_id: user.id,
      body: body.body.trim(),
      internal: Boolean(body.internal),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ note: data })
}