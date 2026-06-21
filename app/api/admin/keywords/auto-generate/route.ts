import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { diversifyKeywordIdeas, isNearDuplicateKeyword } from '@/lib/ai/keyword-diversity';
import { getBlockedKeywordTexts } from '@/lib/automation/keyword-blocklist';
import { findExistingPostForTopic } from '@/lib/content/duplicate-guard';

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

export async function POST(request: Request) {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body?.count === 'number' && Number.isFinite(body.count) ? body.count : 20;
    const focus = normalizeText(body?.focus);
    const audience = normalizeText(body?.audience) || 'mixed';
    const gradeBand = normalizeText(body?.grade_band) || 'mixed';

    const requestedCount = Math.max(1, Math.min(count, 50));
    const generatedPool = await generateKeywordIdeas({
      count: Math.max(requestedCount * 8, 120),
      focus,
      audience,
      grade_band: gradeBand
    });

    if (generatedPool.length === 0) {
      return NextResponse.json({ error: 'No keyword ideas were generated.' }, { status: 500 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('content_keywords')
      .select('keyword')
      .neq('status', 'rejected')
      .limit(2000);

    if (existingError) throw existingError;

    const blockedKeywords = await getBlockedKeywordTexts();
    const existingKeywords = [
      ...(existing || [])
        .map((row) => String(row.keyword || '').toLowerCase().trim())
        .filter(Boolean),
      ...blockedKeywords
    ];

    const ideas = diversifyKeywordIdeas(generatedPool, {
      max: requestedCount * 3,
      existingKeywords,
      maxPerCluster: 3
    });

    const freshIdeas = [];
    let duplicatePosts = 0;

    for (const item of ideas) {
      if (existingKeywords.some((keyword) => isNearDuplicateKeyword(keyword, item.keyword))) continue;

      const duplicatePost = await findExistingPostForTopic(item.keyword);
      if (duplicatePost) {
        duplicatePosts += 1;
        continue;
      }

      freshIdeas.push(item);
      existingKeywords.push(item.keyword.toLowerCase().trim());
      if (freshIdeas.length >= requestedCount) break;
    }

    const rows = freshIdeas.map((item) => ({
      keyword: item.keyword,
      status: 'review',
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
        skipped: generatedPool.length,
        ideas: [],
        message: 'All generated keyword intents already exist, were rejected before, or already match existing posts. The generator blocked them before showing results.'
      });
    }

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from('content_keywords')
      .insert(rows)
      .select('*');

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      inserted: insertedRows?.length ?? rows.length,
      skipped: generatedPool.length - rows.length,
      duplicatePosts,
      ideas: insertedRows ?? rows,
      message: duplicatePosts > 0 ? `Generated diverse keyword ideas are ready for review. Skipped ${duplicatePosts} topic(s) that already have posts.` : 'Generated diverse keyword ideas are ready for review.'
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto keyword generation failed.' }, { status: 500 });
  }
}
