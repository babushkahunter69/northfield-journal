import { supabaseAdmin } from '@/lib/supabase-admin';
import { keywordIntentKey, normalizeKeyword } from '@/lib/ai/keyword-diversity';

export type KeywordBlockInput = {
  keyword: string;
  reason?: string;
  original_status?: string;
};

function cleanKeyword(value: unknown) {
  return String(value || '').trim();
}

function isMissingBlocklistTable(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message || error || '');
  return /content_keyword_blocks|does not exist|schema cache/i.test(message);
}

export async function getBlockedKeywordTexts(limit = 10000): Promise<string[]> {
  const response = await supabaseAdmin
    .from('content_keyword_blocks')
    .select('keyword, intent_key')
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (response.error) {
    if (isMissingBlocklistTable(response.error)) return [];
    throw new Error(response.error.message || 'Failed to load blocked keyword intents.');
  }

  return (response.data || [])
    .flatMap((row: { keyword?: string; intent_key?: string }) => [row.keyword, row.intent_key])
    .map((value: unknown) => cleanKeyword(value).toLowerCase())
    .filter(Boolean);
}

export async function blockKeywordIdeas(items: KeywordBlockInput[]) {
  const rows = items
    .map((item) => {
      const keyword = cleanKeyword(item.keyword);
      if (!keyword) return null;
      return {
        keyword,
        normalized_keyword: normalizeKeyword(keyword),
        intent_key: keywordIntentKey(keyword) || normalizeKeyword(keyword),
        reason: cleanKeyword(item.reason) || 'rejected',
        original_status: cleanKeyword(item.original_status) || 'skipped',
        last_seen_at: new Date().toISOString()
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return { success: true, blocked: 0 };

  const response = await supabaseAdmin
    .from('content_keyword_blocks')
    .upsert(rows, { onConflict: 'intent_key' });

  if (response.error) {
    if (isMissingBlocklistTable(response.error)) {
      return { success: false, blocked: 0, error: 'Missing content_keyword_blocks table. Run the Supabase migration first.' };
    }
    throw new Error(response.error.message || 'Failed to save blocked keyword intents.');
  }

  return { success: true, blocked: rows.length };
}
