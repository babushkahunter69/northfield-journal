import Link from 'next/link';
import { format } from 'date-fns';
import { approveSubmission, rejectSubmission, signOut } from '@/app/actions';
import { requireAdmin } from '@/lib/auth';
import { getCategories } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function AdminSubmissionsPage() {
  await requireAdmin();
  const [categories, submissionsResponse] = await Promise.all([
    getCategories(),
    supabaseAdmin.from('guest_post_submissions').select('*').order('created_at', { ascending: false })
  ]);

  const submissions = submissionsResponse.data ?? [];

  return (
    <div className="container-shell py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Editorial dashboard</p>
          <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">Contributor submissions</h1>
          <p className="mt-3 text-slate-600">Review incoming pitches and publish the strongest pieces into the journal.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/editor" className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900">
            Open CMS editor
          </Link>
          <form action={signOut}>
            <button className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        {submissions.map((submission) => (
          <article key={submission.id} className="paper p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>{submission.topic_category}</span>
                  <span>{submission.status}</span>
                  <span>{format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">{submission.proposed_title}</h2>
                <p className="mt-2 text-slate-600">By {submission.full_name} · {submission.email}</p>
                {submission.target_keyword ? <p className="mt-2 text-sm text-slate-500">Primary keyword: {submission.target_keyword}</p> : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {submission.bio ? <InfoCard label="Bio" value={submission.bio} /> : null}
              {submission.article_angle ? <InfoCard label="Editorial angle" value={submission.article_angle} /> : null}
              {submission.target_audience ? <InfoCard label="Target audience" value={submission.target_audience} /> : null}
              {submission.source_links ? <InfoCard label="Sources or links" value={submission.source_links} /> : null}
              {submission.portfolio_url ? <InfoCard label="Portfolio" value={submission.portfolio_url} /> : null}
              {submission.linkedin_url ? <InfoCard label="LinkedIn" value={submission.linkedin_url} /> : null}
              {submission.notes ? <InfoCard label="Notes" value={submission.notes} /> : null}
              <InfoCard label="Originality confirmed" value={submission.consent_original ? 'Yes' : 'No'} />
            </div>

            <div className="mt-5 rounded-[24px] bg-stone-50 p-5 text-slate-700 whitespace-pre-wrap">
              {submission.article_content}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <form action={approveSubmission} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <input type="hidden" name="submissionId" value={submission.id} />
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Publish into category</span>
                  <select name="categoryId" className="w-full rounded-2xl border border-slate-300 px-4 py-3">
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="featured" className="h-4 w-4" />
                  Mark as featured
                </label>
                <button className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white">
                  Approve & publish
                </button>
              </form>
              <form action={rejectSubmission}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <button className="rounded-2xl border border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-700">
                  Reject
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}