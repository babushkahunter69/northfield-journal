import { supabaseAdmin } from '@/lib/supabase-admin';

export type AutomationLogStatus = 'info' | 'success' | 'warning' | 'error';

export async function logAutomationEvent(input: {
  source: string;
  event_type: string;
  status: AutomationLogStatus;
  message: string;
  meta?: Record<string, unknown> | null;
}) {
  try {
    await supabaseAdmin.from('automation_logs').insert({
      source: input.source,
      event_type: input.event_type,
      status: input.status,
      message: input.message,
      meta: input.meta ?? null
    });
  } catch (error) {
    console.error('[automation log failed]', error);
  }
}