import { supabaseAdmin } from '@/lib/supabase-admin';
import { KeywordManager } from '@/components/admin/keyword-manager';
import KeywordBulkImport from '@/components/admin/KeywordBulkImport';
import AutoKeywordGenerator from '@/components/admin/AutoKeywordGenerator';

export const dynamic = 'force-dynamic';

export default async function AdminKeywordsPage() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
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
                Use this when you want to import keywords from external research,
                campaign planning, seasonal topics, or your own curated lists.
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

      <KeywordManager initialKeywords={response.data ?? []} />
    </div>
  );
}