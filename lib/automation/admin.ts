import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { diversifyKeywordIdeas, isNearDuplicateKeyword } from '@/lib/ai/keyword-diversity';
import { generateDraftFromKeywordId } from '@/lib/content/queue';
import { runDraftBatch } from '@/lib/cron/run-next-draft';
import { findExistingPostForTopic } from '@/lib/content/duplicate-guard';

function clean(value: unknown) {
  return String(value || '').trim();
}

export async function generateAutomationKeywords(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  const requestedCount = Math.max(1, Math.min(Number(input.count || 20), 50));
  const generationCount = Math.max(requestedCount * 8, 120);
  const generatedPool = await generateKeywordIdeas({
    count: generationCount,
    focus: clean(input.focus),
    audience: clean(input.audience) || 'mixed',
    grade_band: clean(input.grade_band) || 'mixed'
  });

  if (generatedPool.length === 0) {
    return { success: true, inserted: 0, skipped: 0, duplicatePosts: 0, ideas: [], message: 'No keyword ideas were generated.' };
  }

  const existingResponse = await supabaseAdmin
    .from('content_keywords')
    .select('keyword')
    .neq('status', 'rejected')
    .limit(2000);

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message || 'Failed to check existing keywords.');
  }

  const existingKeywordList = (existingResponse.data || []).map((row) => String(row.keyword || '').toLowerCase().trim()).filter(Boolean);
  const generated = diversifyKeywordIdeas(generatedPool, {
    max: requestedCount * 3,
    existingKeywords: existingKeywordList,
    maxPerCluster: 3
  });

  const freshIdeas = [];
  let skippedExistingKeyword = 0;
  let skippedExistingPost = 0;

  for (const item of generated) {
    const normalized = item.keyword.toLowerCase().trim();

    if (existingKeywordList.some((keyword) => isNearDuplicateKeyword(keyword, normalized))) {
      skippedExistingKeyword += 1;
      continue;
    }

    const duplicatePost = await findExistingPostForTopic(item.keyword);
    if (duplicatePost) {
      skippedExistingPost += 1;
      continue;
    }

    freshIdeas.push(item);
  }

  const rows = freshIdeas.slice(0, requestedCount).map((item) => ({
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
    return {
      success: true,
      inserted: 0,
      skipped: generated.length,
      duplicatePosts: skippedExistingPost,
      ideas: [],
      message: 'All generated keywords already exist or match existing posts.'
    };
  }

  const insertResponse = await supabaseAdmin.from('content_keywords').insert(rows).select('*');
  if (insertResponse.error) {
    throw new Error(insertResponse.error.message || 'Failed to insert generated keywords.');
  }

  const insertedRows = insertResponse.data ?? rows;
  return {
    success: true,
    inserted: insertedRows.length,
    skipped: generated.length - insertedRows.length,
    duplicatePosts: skippedExistingPost,
    ideas: insertedRows,
    message:
      skippedExistingPost > 0
        ? `Generated keyword ideas are ready for review. Skipped ${skippedExistingPost} topic(s) that already have posts.`
        : 'Generated keyword ideas are ready for review.'
  };
}

export async function draftNextQueuedKeyword() {
  const nextResponse = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword')
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (nextResponse.error) {
    throw new Error(nextResponse.error.message || 'Failed to fetch next approved keyword.');
  }

  if (!nextResponse.data || nextResponse.data.length === 0) {
    return { success: true, processed: 0, message: 'No approved keywords found. Approve keywords from the Keywords page first.', post: null };
  }

  const result = await runDraftBatch(1);
  const success = result.results.find((item) => item.success);

  if (success?.success) {
    return { success: true, processed: result.processed, skipped: result.skipped, keyword: success.keyword, post: success.post };
  }

  return {
    success: false,
    processed: result.processed,
    skipped: result.skipped,
    post: null,
    message: result.message || 'No unique approved keyword was available.'
  };
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
      skipped: (result.skipped || 0) + refill.skipped,
      duplicatePosts: refill.duplicatePosts,
      message: refill.inserted > 0
        ? 'Generated new keyword ideas for review. Approve keywords before drafting.'
        : result.message
    };
  }

  return { ...result, refilled: 0, skipped: result.skipped || 0 };
}

export async function cleanupDuplicateKeywords() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword, status, priority, created_at')
    .in('status', ['review', 'queued'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to load keywords.');
  }

  const kept: Array<{ keyword: string }> = [];
  const duplicateIds: string[] = [];

  for (const row of response.data || []) {
    const keyword = String(row.keyword || '').toLowerCase().trim();
    if (!keyword) continue;

    if (kept.some((item) => isNearDuplicateKeyword(item.keyword, keyword))) {
      duplicateIds.push(row.id);
      continue;
    }

    kept.push({ keyword });
  }

  if (duplicateIds.length === 0) {
    return { success: true, deleted: 0, message: 'No exact or near-duplicate keyword intents found.' };
  }

  const deleteResponse = await supabaseAdmin
    .from('content_keywords')
    .delete()
    .in('id', duplicateIds);

  if (deleteResponse.error) {
    throw new Error(deleteResponse.error.message || 'Failed to delete duplicate keywords.');
  }

  return {
    success: true,
    deleted: duplicateIds.length,
    message: `Deleted ${duplicateIds.length} duplicate keyword intent(s).`
  };
}
