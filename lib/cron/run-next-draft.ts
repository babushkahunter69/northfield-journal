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

  if (result.processed === 0) {
    return {
      success: true,
      message: 'No approved queued keywords found.',
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: []
    };
  }

  const first = result.results[0];

  if (first?.success) {
    return {
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      keyword: first.keyword,
      post: first.post,
      results: result.results
    };
  }

  return {
    success: false,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
    results: result.results,
    error: first && !first.success ? first.error : 'Draft generation failed.'
  };
}

export async function runDraftBatch(limit = 3) {
  const safeLimit = Math.max(1, Math.min(limit, 10));

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
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message || 'Failed to fetch queued keywords.');
  }

  if (!keywords || keywords.length === 0) {
    return {
      success: true,
      message: 'No approved queued keywords found.',
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: [] as RunOneResult[]
    };
  }

  const results: RunOneResult[] = [];

  for (const keyword of keywords) {
    try {
      const post = await generateDraftFromKeywordId(keyword.id);

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

  const succeeded = results.filter((item) => item.success).length;
  const failed = results.length - succeeded;

  return {
    success: failed === 0,
    processed: results.length,
    succeeded,
    failed,
    results
  };
}