import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { diversifyKeywordIdeas, isNearDuplicateKeyword } from '@/lib/ai/keyword-diversity';
import { generateDraftFromKeywordId } from '@/lib/content/queue';
import { runDraftBatch } from '@/lib/cron/run-next-draft';
import { findExistingPostForTopic } from '@/lib/content/duplicate-guard';
import { blockKeywordIdeas, getBlockedKeywordTexts } from '@/lib/automation/keyword-blocklist';

function clean(value: unknown) {
  return String(value || '').trim();
}


export async function refillQueuedKeywordBacklog(input: {
  minQueueSize?: number;
  refillAmount?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
} = {}) {
  const minQueueSize = Math.max(5, Math.min(Number(input.minQueueSize || 45), 120));
  const refillAmount = Math.max(10, Math.min(Number(input.refillAmount || 50), 150));

  const { count, error: countError } = await supabaseAdmin
    .from('content_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');

  if (countError) {
    throw new Error(countError.message || 'Failed to count queued keywords.');
  }

  const queuedCount = count ?? 0;
  if (queuedCount >= minQueueSize) {
    return {
      success: true,
      inserted: 0,
      queued_count_before: queuedCount,
      queued_count_after: queuedCount,
      skipped: 0,
      duplicatePosts: 0,
      message: 'Queue is healthy. No refill needed.'
    };
  }

  const needed = Math.max(refillAmount, minQueueSize - queuedCount);
  const generatedPool = await generateKeywordIdeas({
    count: Math.max(needed * 10, 300),
    focus: clean(input.focus),
    audience: clean(input.audience) || 'mixed',
    grade_band: clean(input.grade_band) || 'mixed'
  });

  const existingResponse = await supabaseAdmin
    .from('content_keywords')
    .select('keyword')
    .neq('status', 'rejected')
    .limit(5000);

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message || 'Failed to check existing keywords.');
  }

  const blockedKeywordList = await getBlockedKeywordTexts();

  const existingKeywordList = [
    ...(existingResponse.data || [])
      .map((row: { keyword?: string }) => String(row.keyword || '').toLowerCase().trim())
      .filter(Boolean),
    ...blockedKeywordList
  ];

  const diversified = diversifyKeywordIdeas(generatedPool, {
    max: needed * 2,
    existingKeywords: existingKeywordList,
    maxPerCluster: 8
  });

  const freshIdeas = [];
  let skippedExistingKeyword = 0;
  let skippedExistingPost = 0;

  for (const item of diversified) {
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
    existingKeywordList.push(normalized);

    if (freshIdeas.length >= needed) break;
  }

  const rows = freshIdeas.map((item) => ({
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

  if (rows.length > 0) {
    const insertResponse = await supabaseAdmin.from('content_keywords').insert(rows).select('id');
    if (insertResponse.error) {
      throw new Error(insertResponse.error.message || 'Failed to insert queued keywords.');
    }
  }

  return {
    success: true,
    inserted: rows.length,
    queued_count_before: queuedCount,
    queued_count_after: queuedCount + rows.length,
    skipped: skippedExistingKeyword,
    duplicatePosts: skippedExistingPost,
    message:
      rows.length > 0
        ? `Refilled the draft queue with ${rows.length} keyword(s).`
        : 'No fresh queued keywords were available after duplicate checks.'
  };
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

  const blockedKeywordList = await getBlockedKeywordTexts();
  const existingKeywordList = [
    ...(existingResponse.data || [])
      .map((row: { keyword?: string }) => String(row.keyword || '').toLowerCase().trim())
      .filter(Boolean),
    ...blockedKeywordList
  ];
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
    return {
      success: true,
      inserted: 0,
      skipped: generated.length,
      duplicatePosts: skippedExistingPost,
      ideas: [],
      message: 'All generated keywords already exist or match existing posts. The automatic refill will keep searching the larger evergreen keyword bank.'
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
        ? `Generated keyword ideas were added directly to the draft queue. Skipped ${skippedExistingPost} topic(s) that already have posts.`
        : 'Generated keyword ideas were added directly to the draft queue.'
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
    const refill = await refillQueuedKeywordBacklog({
      minQueueSize: 20,
      refillAmount: 30,
      focus: '',
      audience: 'mixed',
      grade_band: 'mixed'
    });

    if (refill.inserted === 0) {
      return {
        success: true,
        processed: 0,
        refilled: 0,
        message: refill.message || 'No usable queued keywords found.',
        post: null
      };
    }
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

  if (result.succeeded === 0 && input.refillIfEmpty !== false) {
    const refill = await refillQueuedKeywordBacklog({
      minQueueSize: Math.max(20, limit * 10),
      refillAmount: Math.max(20, limit * 10),
      focus: input.focus,
      audience: input.audience,
      grade_band: input.grade_band
    });

    if (refill.inserted > 0) {
      const retry = await runDraftBatch(limit);
      return {
        ...retry,
        success: retry.failed === 0,
        refilled: refill.inserted,
        skipped: (retry.skipped || 0) + refill.skipped,
        duplicatePosts: refill.duplicatePosts,
        message: retry.succeeded > 0
          ? `Refilled ${refill.inserted} keyword(s) and created ${retry.succeeded} draft(s).`
          : retry.message
      };
    }

    return {
      ...result,
      success: true,
      refilled: 0,
      skipped: (result.skipped || 0) + refill.skipped,
      duplicatePosts: refill.duplicatePosts,
      message: refill.message || result.message
    };
  }

  return { ...result, refilled: 0, skipped: result.skipped || 0 };
}

export async function cleanupDuplicateKeywords() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword, status, priority, created_at')
    .in('status', ['review', 'queued', 'skipped', 'rejected'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to load keywords.');
  }

  const rejectedRows = (response.data || []).filter((row: { status?: string }) => ['skipped', 'rejected'].includes(String(row.status)));
  const rejectedIds = rejectedRows.map((row: { id?: string }) => row.id).filter(Boolean);

  if (rejectedRows.length > 0) {
    const blockResponse = await blockKeywordIdeas(
      rejectedRows.map((row: { keyword: string; status?: string }) => ({
        keyword: row.keyword,
        reason: 'rejected_cleanup',
        original_status: row.status
      }))
    );

    if (!blockResponse.success) {
      throw new Error(blockResponse.error || 'Rejected keyword archive is not ready. Run the Supabase blocklist migration first.');
    }
  }

  const kept: Array<{ keyword: string }> = [];
  const duplicateIds: string[] = [];
  const duplicateRows: Array<{ keyword: string; status?: string }> = [];

  for (const row of response.data || []) {
    if (['skipped', 'rejected'].includes(String(row.status))) continue;

    const keyword = String(row.keyword || '').toLowerCase().trim();
    if (!keyword) continue;

    if (kept.some((item) => isNearDuplicateKeyword(item.keyword, keyword))) {
      duplicateIds.push(row.id);
      duplicateRows.push({ keyword: row.keyword, status: row.status });
      continue;
    }

    kept.push({ keyword });
  }

  if (duplicateRows.length > 0) {
    const blockResponse = await blockKeywordIdeas(
      duplicateRows.map((row: { keyword: string; status?: string }) => ({
        keyword: row.keyword,
        reason: 'near_duplicate_cleanup',
        original_status: row.status
      }))
    );

    if (!blockResponse.success) {
      throw new Error(blockResponse.error || 'Keyword blocklist is not ready. Run the Supabase blocklist migration first.');
    }
  }

  const idsToDelete = Array.from(new Set([...rejectedIds, ...duplicateIds]));

  if (idsToDelete.length === 0) {
    return { success: true, deleted: 0, archived: 0, message: 'No rejected or duplicate keyword intents found.' };
  }

  const deleteResponse = await supabaseAdmin
    .from('content_keywords')
    .delete()
    .in('id', idsToDelete);

  if (deleteResponse.error) {
    throw new Error(deleteResponse.error.message || 'Failed to delete rejected or duplicate keywords.');
  }

  return {
    success: true,
    deleted: idsToDelete.length,
    archived: rejectedRows.length + duplicateRows.length,
    message: `Archived and deleted ${idsToDelete.length} rejected/duplicate keyword intent(s). They will be blocked from future generation.`
  };
}
