import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { KeywordManager } from '@/components/admin/keyword-manager';
import KeywordBulkImport from '@/components/admin/KeywordBulkImport';
import AutoKeywordGenerator from '@/components/admin/AutoKeywordGenerator';
import { AutomationDashboard } from '@/components/admin/AutomationDashboard';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { generateDraftFromKeywordId } from '@/lib/content/queue';
import { getClusterLabel, getRecommendationLabel } from '@/lib/seo/keyword-intelligence';

export const dynamic = 'force-dynamic';

type KeywordRow = {
  id: string;
  keyword: string;
  status: string;
  priority: number | null;
  quality_score?: number | null;
  approval_recommendation?: string | null;
  scoring_notes?: {
    reasons?: string[];
    risks?: string[];
  } | null;
  score_breakdown?: Record<string, number> | null;
  pillar?: string | null;
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
    .update({ status: 'queued', approved_at: new Date().toISOString(), last_error: null })
    .eq('id', id);

  revalidatePath('/admin/keywords');
}

async function rejectKeyword(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;

  await supabaseAdmin
    .from('content_keywords')
    .update({ status: 'rejected', rejected_at: new Date().toISOString(), last_error: null })
    .eq('id', id);

  revalidatePath('/admin/keywords');
}

async function generateDraftNow(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) return;

  await supabaseAdmin
    .from('content_keywords')
    .update({ status: 'queued', approved_at: new Date().toISOString(), last_error: null })
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

  const generated = await generateKeywordIdeas({ count, focus, audience, grade_band: gradeBand });

  if (generated.length === 0) {
    revalidatePath('/admin/keywords');
    return;
  }

  const lowerKeywords = generated.map((item) => item.keyword.toLowerCase());

  const { data: existing } = await supabaseAdmin
    .from('content_keywords')
    .select('keyword')
    .in('keyword', lowerKeywords);

  const existingSet = new Set((existing || []).map((row) => String(row.keyword || '').toLowerCase()));

  const rows = generated
    .filter((item) => !existingSet.has(item.keyword.toLowerCase()))
    .map((item) => ({
      keyword: item.keyword,
      status: 'candidate',
      priority: item.quality_score,
      quality_score: item.quality_score,
      approval_recommendation: item.approval_recommendation,
      scoring_notes: item.scoring_notes,
      score_breakdown: item.score_breakdown,
      pillar: item.pillar,
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

function RecommendationBadge({ recommendation }: { recommendation?: string | null }) {
  const normalized = recommendation || 'review';
  const styles: Record<string, string> = {
    approve_first: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    review: 'bg-blue-100 text-blue-800 border-blue-200',
    reject: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[normalized] || styles.review}`}>
      {getRecommendationLabel(normalized)}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 84
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : score >= 72
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-rose-100 text-rose-800 border-rose-200';

  return (
    <span className={`inline-flex min-w-14 justify-center rounded-full border px-3 py-1 text-sm font-bold ${color}`}>
      {score}
    </span>
  );
}

function CandidateKeywordReview({ keywords }: { keywords: KeywordRow[] }) {
  const candidates = keywords.filter((item) => item.status === 'candidate');
  const queued = keywords.filter((item) => item.status === 'queued');
  const approveFirst = candidates.filter((item) => (item.approval_recommendation || 'review') === 'approve_first');
  const review = candidates.filter((item) => (item.approval_recommendation || 'review') === 'review');
  const reject = candidates.filter((item) => (item.approval_recommendation || 'review') === 'reject');

  const clusterCounts = candidates.reduce<Record<string, number>>((acc, item) => {
    const key = item.cluster || 'student-success';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sortedCandidates = [...candidates].sort((a, b) => {
    const recWeight = (value?: string | null) =>
      value === 'approve_first' ? 3 : value === 'review' ? 2 : 1;

    const recDiff = recWeight(b.approval_recommendation) - recWeight(a.approval_recommendation);
    if (recDiff !== 0) return recDiff;

    return (b.quality_score ?? b.priority ?? 0) - (a.quality_score ?? a.priority ?? 0);
  });

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Keyword Intelligence
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Review scored keyword ideas before drafting
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The system now groups keywords into clusters, scores quality, and tells you which ideas to approve first.
            Only approved keywords enter the draft queue.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{candidates.length}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Candidates</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{approveFirst.length}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Approve First</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{queued.length}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Queued</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-slate-900">{reject.length}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reject</p>
          </div>
        </div>
      </div>

      <form action={generateCandidateKeywords} className="mt-6 grid gap-3 rounded-2xl border border-amber-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px_120px_auto]">
        <input name="focus" defaultValue="study techniques" className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-slate-900" placeholder="Focus, e.g. study techniques" />
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
        <input name="count" defaultValue="15" type="number" min="5" max="30" className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-slate-900" />
        <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Generate Ideas
        </button>
      </form>

      {Object.keys(clusterCounts).length > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Cluster map
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(clusterCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cluster, count]) => (
                <span key={cluster} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {getClusterLabel(cluster)} · {count}
                </span>
              ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-white">
        <div className="border-b border-amber-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Candidate keywords</h3>
          <p className="mt-1 text-sm text-slate-500">
            Start with keywords marked “Approve first.” Review keywords can still be good, but need your judgment.
          </p>
        </div>

        {sortedCandidates.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No candidate keywords waiting for review.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {sortedCandidates.slice(0, 40).map((item) => {
              const score = item.quality_score ?? item.priority ?? 70;
              const notes = item.scoring_notes || {};
              const reasons = Array.isArray(notes.reasons) ? notes.reasons : [];
              const risks = Array.isArray(notes.risks) ? notes.risks : [];

              return (
                <div key={item.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[1fr_120px_150px_180px_250px] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{item.keyword}</p>
                      <RecommendationBadge recommendation={item.approval_recommendation} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {getClusterLabel(item.cluster)} · {item.pillar || 'Study Skills and Student Success'} · {item.audience || 'students'} · {item.grade_band || 'general'}
                    </p>
                    {reasons.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {reasons.slice(0, 3).map((reason) => (
                          <li key={reason} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {risks.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {risks.slice(0, 2).map((risk) => (
                          <li key={risk} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700">
                            {risk}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.last_error ? <p className="mt-2 text-xs text-rose-600">{item.last_error}</p> : null}
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-500">Quality</p>
                    <ScorePill score={score} />
                  </div>

                  <KeywordStatusBadge status={item.status} />

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-500">Suggested Action</p>
                    <p className="text-sm font-semibold text-slate-900">{getRecommendationLabel(item.approval_recommendation)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <form action={approveKeyword}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white">Approve</button>
                    </form>
                    <form action={generateDraftNow}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Draft Now</button>
                    </form>
                    <form action={rejectKeyword}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700">Reject</button>
                    </form>
                  </div>
                </div>
              );
            })}
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
      .order('quality_score', { ascending: false, nullsFirst: false })
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Manual Import</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Paste or upload your own keywords</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Imported keywords are scored and saved for review first. Approve the ones you want the system to draft.
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
