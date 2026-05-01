import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateDraftFromKeywordId } from '@/lib/content/queue';

function isCronSecretValid(request: Request) {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export function isCronAuthorized(request: Request) {
  return isCronSecretValid(request);
}

type RunOneResult =
  | {
      success: true;
      keyword: {
        id: string;
        keyword: string;
      };
      post: {
        id: string;
        slug: string;
        title: string;
        status: string;
      };
    }
  | {
      success: false;
      keyword: {
        id: string;
        keyword: string;
      };
      error: string;
    };

export async function runNextDraftJob() {
  const result = await runDraftBatch(1);

  if (result.succeeded === 0 && result.processed === 0) {
    return {
      success: true,
      message: 'No approved non-duplicate keywords found.',
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: []
    };
  }

  const firstSuccess = result.results.find((item) => item.success);

  if (firstSuccess?.success) {
    return {
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      keyword: firstSuccess.keyword,
      post: firstSuccess.post,
      results: result.results
    };
  }

  const first = result.results[0];

  return {
    success: false,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    results: result.results,
    error: first && !first.success ? first.error : 'Draft generation failed.'
  };
}

function isDuplicateSkipError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /skipped duplicate/i.test(message);
}

export async function runDraftBatch(limit = 3) {
  const safeLimit = Math.max(1, Math.min(limit, 10));

  // Fetch extra candidates so the daily cron can skip duplicates and still draft
  // the next unique, approved topic in the same run.
  const { data: keywords, error } = await supabaseAdmin
    .from('content_keywords')
    .select(`
      id,
      keyword,
      status,
      priority,
      created_at
    `)
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(safeLimit * 10);

  if (error) {
    throw new Error(error.message || 'Failed to fetch queued keywords.');
  }

  if (!keywords || keywords.length === 0) {
    return {
      success: true,
      message: 'No queued keywords found.',
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      results: [] as RunOneResult[]
    };
  }

  const results: RunOneResult[] = [];
  let succeeded = 0;
  let skipped = 0;

  for (const keyword of keywords) {
    if (succeeded >= safeLimit) break;

    try {
      const post = await generateDraftFromKeywordId(keyword.id);
      succeeded += 1;

      results.push({
        success: true,
        keyword: {
          id: keyword.id,
          keyword: keyword.keyword
        },
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          status: post.status
        }
      });
    } catch (error) {
      if (isDuplicateSkipError(error)) skipped += 1;

      results.push({
        success: false,
        keyword: {
          id: keyword.id,
          keyword: keyword.keyword
        },
        error: error instanceof Error ? error.message : 'Unknown generation error'
      });
    }
  }

  const failed = results.filter((item) => !item.success).length - skipped;

  return {
    success: succeeded >= safeLimit || failed === 0,
    processed: results.length,
    succeeded,
    failed,
    skipped,
    message:
      succeeded > 0
        ? `Created ${succeeded} draft(s). Skipped ${skipped} duplicate keyword(s).`
        : skipped > 0
          ? `Skipped ${skipped} duplicate keyword(s). No unique approved keywords were available.`
          : 'No draft was created.',
    results
  };
}
