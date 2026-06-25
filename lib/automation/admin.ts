import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import type { GeneratedKeywordIdea } from '@/lib/ai/generate-keywords';
import { diversifyKeywordIdeas, isNearDuplicateKeyword, keywordIntentKey } from '@/lib/ai/keyword-diversity';
import { generateDraftFromKeywordId } from '@/lib/content/queue';
import { runDraftBatch } from '@/lib/cron/run-next-draft';
import { findExistingPostForTopic } from '@/lib/content/duplicate-guard';

function clean(value: unknown) {
  return String(value || '').trim();
}

function isMissingBlockTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /content_keyword_blocks|relation .* does not exist|could not find the table|schema cache/i.test(message);
}

async function getBlockedKeywordList() {
  const response = await supabaseAdmin
    .from('content_keyword_blocks')
    .select('keyword')
    .limit(5000);

  if (response.error) {
    if (isMissingBlockTableError(response.error)) return [];
    throw new Error(response.error.message || 'Failed to read rejected keyword blocklist.');
  }

  return (response.data || [])
    .map((row: { keyword?: string | null }) => String(row.keyword || '').toLowerCase().trim())
    .filter(Boolean);
}

async function addKeywordsToBlocklist(rows: Array<{ keyword: string; reason?: string }>) {
  if (rows.length === 0) return 0;

  const payload = rows
    .map((row) => {
      const keyword = clean(row.keyword).toLowerCase();
      return keyword
        ? {
            keyword,
            intent_key: keywordIntentKey(keyword),
            reason: clean(row.reason) || 'rejected'
          }
        : null;
    })
    .filter((row): row is { keyword: string; intent_key: string; reason: string } => Boolean(row));

  if (payload.length === 0) return 0;

  const response = await supabaseAdmin
    .from('content_keyword_blocks')
    .upsert(payload, { onConflict: 'keyword' });

  if (response.error) {
    if (isMissingBlockTableError(response.error)) return 0;
    throw new Error(response.error.message || 'Failed to update rejected keyword blocklist.');
  }

  return payload.length;
}

export async function archiveAndDeleteRejectedKeywords() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword, status')
    .in('status', ['skipped', 'rejected']);

  if (response.error) {
    throw new Error(response.error.message || 'Failed to load rejected keywords.');
  }

  const rejected = response.data || [];
  if (rejected.length === 0) {
    return { archived: 0, deleted: 0 };
  }

  await addKeywordsToBlocklist(
    rejected.map((row: { keyword?: string | null; status?: string | null }) => ({
      keyword: row.keyword,
      reason: row.status || 'rejected'
    }))
  );

  const deleteResponse = await supabaseAdmin
    .from('content_keywords')
    .delete()
    .in('id', rejected.map((row: { id: string }) => row.id));

  if (deleteResponse.error) {
    throw new Error(deleteResponse.error.message || 'Failed to delete rejected keywords.');
  }

  return { archived: rejected.length, deleted: rejected.length };
}

async function getExistingAndBlockedKeywords() {
  const [existingResponse, blockedKeywords] = await Promise.all([
    supabaseAdmin
      .from('content_keywords')
      .select('keyword')
      .limit(5000),
    getBlockedKeywordList()
  ]);

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message || 'Failed to check existing keywords.');
  }

  const activeKeywords = (existingResponse.data || [])
    .map((row: { keyword?: string | null }) => String(row.keyword || '').toLowerCase().trim())
    .filter(Boolean);

  return [...activeKeywords, ...blockedKeywords];
}

async function buildFreshKeywordRows(input: {
  count: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
  targetStatus: 'review' | 'queued';
}) {
  const requestedCount = Math.max(1, Math.min(Number(input.count || 20), 50));
  const generationCount = Math.max(requestedCount * 30, 500);
  const generatedPool = await generateKeywordIdeas({
    count: generationCount,
    focus: clean(input.focus),
    audience: clean(input.audience) || 'mixed',
    grade_band: clean(input.grade_band) || 'mixed'
  });

  if (generatedPool.length === 0) {
    return { rows: [], generatedCount: 0, skippedExistingKeyword: 0, skippedExistingPost: 0 };
  }

  const existingKeywordList = await getExistingAndBlockedKeywords();
  const generated = diversifyKeywordIdeas(generatedPool, {
    max: requestedCount * 6,
    existingKeywords: existingKeywordList,
    maxPerCluster: Math.max(4, Math.ceil(requestedCount / 7))
  });

  const freshIdeas: GeneratedKeywordIdea[] = [];
  let skippedExistingKeyword = 0;
  let skippedExistingPost = 0;

  for (const item of generated) {
    const normalized = item.keyword.toLowerCase().trim();

    if (existingKeywordList.some((keyword) => isNearDuplicateKeyword(keyword, normalized))) {
      skippedExistingKeyword += 1;
      continue;
    }

    if (freshIdeas.some((idea) => isNearDuplicateKeyword(idea.keyword, normalized))) {
      skippedExistingKeyword += 1;
      continue;
    }

    const duplicatePost = await findExistingPostForTopic(item.keyword);
    if (duplicatePost) {
      await addKeywordsToBlocklist([{ keyword: item.keyword, reason: 'existing_post' }]);
      skippedExistingPost += 1;
      continue;
    }

    freshIdeas.push(item);
    existingKeywordList.push(normalized);

    if (freshIdeas.length >= requestedCount) break;
  }

  const rows = freshIdeas.map((item) => ({
    keyword: item.keyword,
    status: input.targetStatus,
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

  return {
    rows,
    generatedCount: generatedPool.length,
    skippedExistingKeyword,
    skippedExistingPost
  };
}

export async function generateAutomationKeywords(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
  targetStatus?: 'review' | 'queued';
}) {
  await archiveAndDeleteRejectedKeywords();

  const requestedCount = Math.max(1, Math.min(Number(input.count || 20), 50));
  const targetStatus = input.targetStatus || 'review';
  const fresh = await buildFreshKeywordRows({
    count: requestedCount,
    focus: input.focus,
    audience: input.audience,
    grade_band: input.grade_band,
    targetStatus
  });

  if (fresh.rows.length === 0) {
    return {
      success: true,
      inserted: 0,
      skipped: fresh.generatedCount,
      duplicatePosts: fresh.skippedExistingPost,
      ideas: [],
      message: 'No fresh keyword intents were available. Existing, rejected, and already-published intents were blocked.'
    };
  }

  const insertResponse = await supabaseAdmin.from('content_keywords').insert(fresh.rows).select('*');
  if (insertResponse.error) {
    throw new Error(insertResponse.error.message || 'Failed to insert generated keywords.');
  }

  const insertedRows = insertResponse.data ?? fresh.rows;
  return {
    success: true,
    inserted: insertedRows.length,
    skipped: Math.max(0, fresh.generatedCount - insertedRows.length),
    duplicatePosts: fresh.skippedExistingPost,
    ideas: insertedRows,
    message:
      targetStatus === 'queued'
        ? `Added ${insertedRows.length} fresh keyword intent(s) directly to the draft queue.`
        : `Generated ${insertedRows.length} fresh keyword idea(s) for review.`
  };
}

export async function refillQueuedKeywords(input: {
  minQueueSize?: number;
  refillAmount?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  await archiveAndDeleteRejectedKeywords();

  const minQueueSize = Math.max(5, Math.min(Number(input.minQueueSize || 45), 100));
  const refillAmount = Math.max(5, Math.min(Number(input.refillAmount || 30), 75));

  const { count, error: countError } = await supabaseAdmin
    .from('content_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');

  if (countError) throw countError;

  const queuedCount = count ?? 0;
  if (queuedCount >= minQueueSize) {
    return {
      success: true,
      queued_count_before: queuedCount,
      inserted: 0,
      skipped: 0,
      message: 'Queue is healthy. No refill needed.'
    };
  }

  const needed = Math.max(refillAmount, minQueueSize - queuedCount);
  const result = await generateAutomationKeywords({
    count: needed,
    focus: input.focus,
    audience: input.audience,
    grade_band: input.grade_band,
    targetStatus: 'queued'
  });

  return {
    ...result,
    queued_count_before: queuedCount,
    message:
      result.inserted > 0
        ? `Keyword queue refilled with ${result.inserted} fresh keyword intent(s).`
        : result.message
  };
}

export async function draftNextQueuedKeyword() {
  let nextResponse = await supabaseAdmin
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
    await refillQueuedKeywords({ minQueueSize: 45, refillAmount: 45 });
    nextResponse = await supabaseAdmin
      .from('content_keywords')
      .select('id, keyword')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (nextResponse.error) {
      throw new Error(nextResponse.error.message || 'Failed to fetch next approved keyword after refill.');
    }
  }

  if (!nextResponse.data || nextResponse.data.length === 0) {
    return { success: true, processed: 0, message: 'No fresh keyword intents could be refilled.', post: null };
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
  let result = await runDraftBatch(limit);

  if (result.succeeded < limit && input.refillIfEmpty !== false) {
    const refill = await refillQueuedKeywords({
      minQueueSize: Math.max(45, limit * 10),
      refillAmount: Math.max(30, limit * 10),
      focus: input.focus,
      audience: input.audience,
      grade_band: input.grade_band
    });

    if (refill.inserted > 0) {
      result = await runDraftBatch(limit);
    }

    return {
      ...result,
      success: result.failed === 0,
      refilled: refill.inserted,
      skipped: (result.skipped || 0) + (refill.skipped || 0),
      duplicatePosts: 'duplicatePosts' in refill ? refill.duplicatePosts : 0,
      message:
        result.succeeded > 0
          ? result.message
          : refill.inserted > 0
            ? 'Refilled keywords, but no draft was created.'
            : refill.message
    };
  }

  return { ...result, refilled: 0, skipped: result.skipped || 0 };
}

export async function cleanupDuplicateKeywords() {
  const rejectedCleanup = await archiveAndDeleteRejectedKeywords();

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

  for (const row of (response.data || []) as Array<{ id: string; keyword?: string | null }>) {
    const keyword = String(row.keyword || '').toLowerCase().trim();
    if (!keyword) continue;

    if (kept.some((item) => isNearDuplicateKeyword(item.keyword, keyword))) {
      duplicateIds.push(row.id);
      continue;
    }

    kept.push({ keyword });
  }

  if (duplicateIds.length > 0) {
    await addKeywordsToBlocklist(
      ((response.data || []) as Array<{ id: string; keyword?: string | null }>)
        .filter((row) => duplicateIds.includes(row.id))
        .map((row) => ({ keyword: row.keyword || '', reason: 'duplicate_intent' }))
    );

    const deleteResponse = await supabaseAdmin
      .from('content_keywords')
      .delete()
      .in('id', duplicateIds);

    if (deleteResponse.error) {
      throw new Error(deleteResponse.error.message || 'Failed to delete duplicate keywords.');
    }
  }

  const totalDeleted = rejectedCleanup.deleted + duplicateIds.length;
  if (totalDeleted === 0) {
    return { success: true, deleted: 0, archived: 0, message: 'No rejected or duplicate keyword intents found.' };
  }

  return {
    success: true,
    deleted: totalDeleted,
    archived: rejectedCleanup.archived + duplicateIds.length,
    message: `Archived and deleted ${totalDeleted} rejected or duplicate keyword intent(s).`
  };
}
