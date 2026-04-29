import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const count =
      typeof body?.count === 'number' && Number.isFinite(body.count)
        ? body.count
        : 20;

    const focus = normalizeText(body?.focus) || 'education';
    const audience = normalizeText(body?.audience) || 'mixed';
    const gradeBand = normalizeText(body?.grade_band) || 'mixed';

    const generated = await generateKeywordIdeas({
      count,
      focus,
      audience,
      grade_band: gradeBand
    });

    if (generated.length === 0) {
      return NextResponse.json(
        { error: 'No keyword ideas were generated.' },
        { status: 500 }
      );
    }

    const keywords = generated.map((item) => item.keyword.toLowerCase());

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('content_keywords')
      .select('keyword')
      .in('keyword', keywords);

    if (existingError) {
      throw existingError;
    }

    const existingSet = new Set(
      (existing || []).map((row) => String(row.keyword || '').toLowerCase())
    );

    const rows = generated
      .filter((item) => !existingSet.has(item.keyword.toLowerCase()))
      .map((item) => ({
        keyword: item.keyword,
        status: 'queued',
        priority: item.priority,
        audience: item.audience,
        grade_band: item.grade_band,
        subject_area: item.subject_area,
        content_type: item.content_type,
        cluster: item.cluster,
        target_country: item.target_country,
        curriculum: item.curriculum,
        learning_objective: item.learning_objective,
        tone: item.tone
      }));

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        skipped: generated.length,
        message: 'All generated keywords already exist.'
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('content_keywords')
      .insert(rows);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      inserted: rows.length,
      skipped: generated.length - rows.length,
      ideas: rows
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Auto keyword generation failed.'
      },
      { status: 500 }
    );
  }
}