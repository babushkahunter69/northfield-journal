import { supabaseAdmin } from '@/lib/supabase-admin';
import { AutomationControls } from '@/components/admin/AutomationControls';
import { AutomationDashboard } from '@/components/admin/AutomationDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AutomationPage() {
  const logsResponse = await supabaseAdmin
    .from('automation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-8">
      <AutomationControls />
      <AutomationDashboard logs={logsResponse.data ?? []} />
    </div>
  );
}
