import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requiredFields = ['full_name', 'email', 'proposed_title', 'topic_category', 'article_content'] as const;

    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim().length === 0) {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }

    if (!body.consent_original) {
      return NextResponse.json({ error: 'You must confirm originality before submitting.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('guest_post_submissions').insert({
      full_name: body.full_name,
      email: body.email,
      bio: body.bio || null,
      proposed_title: body.proposed_title,
      topic_category: body.topic_category,
      target_keyword: body.target_keyword || null,
      article_angle: body.article_angle || null,
      target_audience: body.target_audience || null,
      source_links: body.source_links || null,
      portfolio_url: body.portfolio_url || null,
      linkedin_url: body.linkedin_url || null,
      article_content: body.article_content,
      notes: body.notes || null,
      consent_original: true,
      status: 'pending'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
