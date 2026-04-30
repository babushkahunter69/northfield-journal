import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { generateDraftFromKeywordId } from '@/lib/content/queue';
import { runDraftBatch } from '@/lib/cron/run-next-draft';

function clean(value: unknown) {
  return String(value || '').trim();
}

export async function generateAutomationKeywords(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  const count = Math.max(1, Math.min(Number(input.count || 20), 50));
  const generated = await generateKeywordIdeas({
    count,
    focus: clean(input.focus) || 'education',
    audience: clean(input.audience) || 'mixed',
    grade_band: clean(input.grade_band) || 'mixed'
  });

  if (generated.length === 0) {
    return { success: true, inserted: 0, skipped: 0, ideas: [], message: 'No keyword ideas were generated.' };
  }

  const keywords = generated.map((item) => item.keyword.toLowerCase());
  const existingResponse = await supabaseAdmin
    .from('content_keywords')
    .select('keyword')
    .in('keyword', keywords);

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message || 'Failed to check existing keywords.');
  }

  const existing = new Set((existingResponse.data || []).map((row) => String(row.keyword || '').toLowerCase()));
  const rows = generated
    .filter((item) => !existing.has(item.keyword.toLowerCase()))
    .map((item) => ({
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
    return { success: true, inserted: 0, skipped: generated.length, ideas: [], message: 'All generated keywords already exist.' };
  }

  const insertResponse = await supabaseAdmin.from('content_keywords').insert(rows).select('*');
  if (insertResponse.error) {
    throw new Error(insertResponse.error.message || 'Failed to insert generated keywords.');
  }

  const insertedRows = insertResponse.data ?? rows;
  return {
    success: true,
    inserted: insertedRows.length,
    skipped: generated.length - rows.length,
    ideas: insertedRows,
    message: 'Generated keyword ideas are ready for review.'
  };
}

export async function draftNextQueuedKeyword() {
  const nextResponse = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword')
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextResponse.error) {
    throw new Error(nextResponse.error.message || 'Failed to fetch next approved keyword.');
  }

  if (!nextResponse.data?.id) {
    return { success: true, processed: 0, message: 'No approved keywords found. Approve keywords from the Keywords page first.', post: null };
  }

  const post = await generateDraftFromKeywordId(nextResponse.data.id);
  return { success: true, processed: 1, keyword: nextResponse.data, post };
}

export async function runAutomationBatch(input: {
  limit?: number;
  refillIfEmpty?: boolean;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  const limit = Math.max(1, Math.min(Number(input.limit || 1), 10));
  const result = await runDraftBatch(limit);

  if (result.processed === 0 && input.refillIfEmpty !== false) {
    const refill = await generateAutomationKeywords({
      count: Math.max(10, limit * 5),
      focus: input.focus,
      audience: input.audience,
      grade_band: input.grade_band
    });

    return {
      ...result,
      success: true,
      refilled: refill.inserted,
      skipped: refill.skipped,
      message: refill.inserted > 0
        ? 'Generated new keyword ideas for review. Approve keywords before drafting.'
        : result.message
    };
  }

  return { ...result, refilled: 0, skipped: 0 };
}

export async function cleanupDuplicateKeywords() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword, status, priority, created_at')
    .order('created_at', { ascending: true });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to load keywords.');
  }

  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const row of response.data || []) {
    const key = String(row.keyword || '').toLowerCase().trim();
    if (!key) continue;
    if (seen.has(key)) duplicateIds.push(row.id);
    else seen.add(key);
  }

  if (duplicateIds.length === 0) return { success: true, deleted: 0 };

  const deleteResponse = await supabaseAdmin
    .from('content_keywords')
    .delete()
    .in('id', duplicateIds);

  if (deleteResponse.error) {
    throw new Error(deleteResponse.error.message || 'Failed to delete duplicate keywords.');
  }

  return { success: true, deleted: duplicateIds.length };
}
