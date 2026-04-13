import { supabaseAdmin } from '@/lib/supabase-admin';
import { QueueTable } from '@/components/admin/queue-table';

export const dynamic = 'force-dynamic';

export default async function AdminQueuePage() {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('id, keyword, cluster, priority, status, last_generated_at')
    .order('status', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return <QueueTable rows={response.data ?? []} />;
}
