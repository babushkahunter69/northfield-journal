import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords'
import { generateDraftFromKeywordId } from '@/lib/content/queue'

export const dynamic = 'force-dynamic'

async function generateAndAutoDraft(formData: FormData) {
  'use server'

  const topic = String(formData.get('topic') || 'study techniques').trim()

  const generated = await generateKeywordIdeas({
    count: 15,
    focus: topic,
    audience: 'students',
    grade_band: 'mixed',
  })

  const strongKeywords = generated.filter(
    (item) =>
      item.approval_recommendation === 'approve_first' &&
      Number(item.quality_score || 0) >= 84
  )

  for (const item of strongKeywords) {
    const { data } = await supabaseAdmin
      .from('content_keywords')
      .insert({
        keyword: item.keyword,
        status: 'queued',
        priority: item.quality_score,
        quality_score: item.quality_score,
        approval_recommendation: item.approval_recommendation,
        scoring_notes: item.scoring_notes,
        score_breakdown: item.score_breakdown,
        pillar: item.pillar,
        cluster: item.cluster,
        audience: item.audience,
        grade_band: item.grade_band,
        subject_area: item.subject_area,
        content_type: item.content_type,
        target_country: item.target_country,
        approved_at: new Date().toISOString(),
        last_error: null,
      })
      .select('id')
      .single()

    if (data?.id) {
      await generateDraftFromKeywordId(data.id)
    }
  }

  revalidatePath('/admin/keywords')
  revalidatePath('/admin/posts')
}

async function cleanWeakKeywords() {
  'use server'

  await supabaseAdmin
    .from('content_keywords')
    .delete()
    .or('approval_recommendation.eq.reject,quality_score.lt.70,status.eq.rejected')

  revalidatePath('/admin/keywords')
}

export default async function KeywordsPage() {
  const { data: keywords } = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .neq('approval_recommendation', 'reject')
    .gte('quality_score', 70)
    .order('quality_score', { ascending: false })

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Keyword Automation
        </p>

        <h1 className="mt-3 text-4xl font-semibold text-slate-900">
          Auto-generate strong keywords and draft articles
        </h1>

        <p className="mt-4 max-w-3xl text-slate-600">
          The system will generate keyword ideas, keep only high-quality
          approve-first keywords, queue them, and send them into article drafting.
        </p>

        <form action={generateAndAutoDraft} className="mt-8 flex gap-3">
          <input
            name="topic"
            defaultValue="study techniques"
            className="w-full rounded-xl border border-[#d8cdbb] px-4 py-3 text-slate-900"
            placeholder="Topic, e.g. exam prep or study techniques"
          />

          <button className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white">
            Generate + Draft
          </button>
        </form>

        <form action={cleanWeakKeywords} className="mt-4">
          <button className="rounded-xl border border-red-300 px-5 py-2 text-sm font-semibold text-red-600">
            Clean weak keywords
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-8">
        <h2 className="text-2xl font-semibold text-slate-900">
          Approved keyword pipeline
        </h2>

        <div className="mt-6 space-y-4">
          {(keywords || []).length === 0 ? (
            <p className="text-slate-500">No approved keywords yet.</p>
          ) : (
            keywords?.map((keyword) => (
              <div
                key={keyword.id}
                className="rounded-2xl border border-[#e2d9cb] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {keyword.keyword}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {keyword.cluster || 'student-success'} ·{' '}
                      {keyword.status || 'queued'}
                    </p>
                  </div>

                  <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                    {keyword.quality_score || keyword.priority || 0}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}