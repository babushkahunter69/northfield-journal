import { supabaseAdmin } from '@/lib/supabase-admin';
import { KeywordManager } from '@/components/admin/keyword-manager';

export const dynamic = 'force-dynamic';

export default async function AdminKeywordsPage() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return <KeywordManager initialKeywords={response.data ?? []} />;
}
