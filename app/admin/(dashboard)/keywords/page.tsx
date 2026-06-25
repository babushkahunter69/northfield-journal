import { supabaseAdmin } from '@/lib/supabase-admin';
import { KeywordManager } from '@/components/admin/keyword-manager';
import AutoKeywordGenerator from '@/components/admin/AutoKeywordGenerator';

export const dynamic = 'force-dynamic';

export default async function AdminKeywordsPage() {
  const keywordsResponse = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <AutoKeywordGenerator />
      <KeywordManager initialKeywords={keywordsResponse.data ?? []} />
    </div>
  );
}
