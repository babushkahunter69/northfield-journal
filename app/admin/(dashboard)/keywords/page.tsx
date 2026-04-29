import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { KeywordManager } from '@/components/admin/keyword-manager';
import KeywordBulkImport from '@/components/admin/KeywordBulkImport';
import AutoKeywordGenerator from '@/components/admin/AutoKeywordGenerator';
import { AutomationDashboard } from '@/components/admin/AutomationDashboard';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { generateDraftFromKeywordId } from '@/lib/content/queue';

export const dynamic = 'force-dynamic';

type KeywordRow = {
  id: string;
  keyword: string;
  status: string;
  priority: number | null;
  cluster: string | null;
  audience: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  content_type?: string | null;
  target_country?: string | null;
  created_at?: string;
  last_error?: string | null;
};

async function approveKeyword(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;

  await supabaseAdmin
    .from('content_keywords')
    .update({ status: 'queued', last_error: null })
    .eq('id', id);

  revalidatePath('/admin/keywords');
}

async function rejectKeyword(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;

  await supabaseAdmin
    .from('content_keywords')
    .update({ status: 'rejected', last_error: null })
    .eq('id', id);

  revalidatePath('/admin/keywords');
}

async function generateDraftNow(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;

  await supabaseAdmin
    .from('content_keywords')
    .update({ status: 'queued', last_error: null })
    .eq('id', id);

  await generateDraftFromKeywordId(id);
  revalidatePath('/admin/keywords');
  revalidatePath('/admin/posts');
}

async function generateCandidateKeywords(formData: FormData) {
  'use server';

  const focus = String(formData.get('focus') || 'study techniques').trim();
  const audience = String(formData.get('audience') || 'students').trim();
  const gradeBand = String(formData.get('grade_band') || 'mixed').trim();
  const countValue = Number(formData.get('count') || 15);
  const count = Number.isFinite(countValue) ? Math.max(5, Math.min(30, countValue)) : 15;

  const generated = await generateKeywordIdeas({
    count,
    focus,
    audience,
    grade_band: gradeBand
  });

  if (generated.length === 0) {
    revalidatePath('/admin/keywords');
    return;
  }

  const lowerKeywords = generated.map((item) => item.keyword.toLowerCase());

  const { data: existing } = await supabaseAdmin
    .from('content_keywords')
    .select('keyword')
    .in('keyword', lowerKeywords);

  const existingSet = new Set(
    (existing || []).map((row) => String(row.keyword || '').toLowerCase())
  );

  const rows = generated
    .filter((item) => !existingSet.has(item.keyword.toLowerCase()))
    .map((item) => ({
      keyword: item.keyword,
      status: 'candidate',
      priority: item.priority,
      audience: item.audience,
      grade_band: item.grade_band,
      subject_area: item.subject_area,
      content_type: item.content_type,
      cluster: item.cluster,
      target_country: item.target_country,
      curriculum: item.curriculum,
      learning_objective: item.learning_objective,
      tone: item.tone,
      last_error: null
    }));

  if (rows.length > 0) {
    await supabaseAdmin.from('content_keywords').insert(rows);
  }

  revalidatePath('/admin/keywords');
}

function KeywordStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    candidate: 'bg-amber-100 text-amber-800 border-amber-200',
    queued: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    skipped: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || styles.skipped}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CandidateKeywordReview({ keywords }: { keywords: KeywordRow[] }) {
  const candidates = keywords.filter((item) => item.status === 'candidate');
  const queued = keywords.filter((item) => item.status === 'queued');

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Hybrid Pipeline
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Review keyword ideas before drafting
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Auto-generated keywords now land here as candidates. Approve the best
            ideas to move them into the draft queue. The cron job only drafts approved queued keywords.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{candidates.length}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Candidates</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{queued.length}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Approved</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">85+</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Target Score</p>
          </div>
        </div>
      </div>

      <form action={generateCandidateKeywords} className="mt-6 grid gap-3 rounded-2xl border border-amber-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px_120px_auto]">
        <input
          name="focus"
          defaultValue="study techniques"
          className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-slate-900"
          placeholder="Focus, e.g. study techniques"
        />
        <select name="audience" defaultValue="students" className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-slate-900">
          <option value="students">Students</option>
          <option value="teachers">Teachers</option>
          <option value="parents">Parents</option>
          <option value="mixed">Mixed</option>
        </select>
        <select name="grade_band" defaultValue="mixed" className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-slate-900">
          <option value="mixed">Mixed grades</option>
          <option value="middle-school">Middle school</option>
          <option value="high-school">High school</option>
          <option value="college">College</option>
          <option value="adult">Adult learners</option>
        </select>
        <input
          name="count"
          defaultValue="15"
          type="number"
          min="5"
          max="30"
          className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-slate-900"
        />
        <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Generate Ideas
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-white">
        <div className="border-b border-amber-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Candidate keywords</h3>
          <p className="mt-1 text-sm text-slate-500">Approve only ideas that fit the site strategy.</p>
        </div>

        {candidates.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            No candidate keywords waiting for review.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {candidates.slice(0, 30).map((item) => (
              <div key={item.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_120px_140px_260px] lg:items-center">
                <div>
                  <p className="font-medium text-slate-900">{item.keyword}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.cluster || 'student-success'} · {item.audience || 'students'} · {item.grade_band || 'general'}
                  </p>
                  {item.last_error ? (
                    <p className="mt-2 text-xs text-rose-600">{item.last_error}</p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Score</p>
                  <p className="text-lg font-semibold text-slate-900">{item.priority ?? 70}</p>
                </div>

                <KeywordStatusBadge status={item.status} />

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <form action={approveKeyword}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white">
                      Approve
                    </button>
                  </form>
                  <form action={generateDraftNow}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                      Draft Now
                    </button>
                  </form>
                  <form action={rejectKeyword}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function AdminKeywordsPage() {
  const [keywordsResponse, logsResponse] = await Promise.all([
    supabaseAdmin
      .from('content_keywords')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  const keywords = (keywordsResponse.data ?? []) as KeywordRow[];

  return (
    <div className="space-y-8">
      <AutomationDashboard logs={logsResponse.data ?? []} />
      <CandidateKeywordReview keywords={keywords} />
      <AutoKeywordGenerator />

      <section className="rounded-[28px] border border-stone-200 bg-white/70 shadow-sm">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                Manual Import
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Paste or upload your own keywords
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Imported keywords are saved for review first. Approve the ones you want the system to draft.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition group-open:bg-stone-100">
              <span className="group-open:hidden">Open</span>
              <span className="hidden group-open:inline">Close</span>
            </div>
          </summary>

          <div className="border-t border-stone-200 px-6 pb-6 pt-6">
            <KeywordBulkImport />
          </div>
        </details>
      </section>

      <KeywordManager initialKeywords={keywordsResponse.data ?? []} />
    </div>
  );
}
