import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json(
        { ok: false, step: 'auth.getUser', error: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, step: 'no-user-session', error: 'No logged-in user found' },
        { status: 401 }
      )
    }

    if (!process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { ok: false, step: 'missing-admin-email', error: 'ADMIN_EMAIL is not set' },
        { status: 500 }
      )
    }

    if (user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        {
          ok: false,
          step: 'admin-email-mismatch',
          error: `Logged in as ${user.email}, but ADMIN_EMAIL is ${process.env.ADMIN_EMAIL}`,
        },
        { status: 401 }
      )
    }

    const body = await req.json()

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        title: body.title,
        slug: body.slug,
        content: body.content,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, step: 'db-insert', error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, post: data })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        step: 'server-catch',
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}