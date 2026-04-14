type AutomationLog = {
  id: string;
  source: string;
  event_type: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function badgeClass(status: AutomationLog['status']) {
  switch (status) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'warning':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'error':
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

export function AutomationDashboard({
  logs
}: {
  logs: AutomationLog[];
}) {
  const successCount = logs.filter((log) => log.status === 'success').length;
  const warningCount = logs.filter((log) => log.status === 'warning').length;
  const errorCount = logs.filter((log) => log.status === 'error').length;

  return (
    <section className="rounded-[28px] border border-[#e2d9cb] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">
          Monitoring
        </p>
        <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#0f172a]">
          Automation Dashboard
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Recent cron runs, keyword refills, and automation events.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[22px] border border-[#e2d9cb] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Success</p>
          <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{successCount}</p>
        </div>
        <div className="rounded-[22px] border border-[#e2d9cb] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Warnings</p>
          <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{warningCount}</p>
        </div>
        <div className="rounded-[22px] border border-[#e2d9cb] bg-white p-5">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Errors</p>
          <p className="mt-3 text-3xl font-semibold text-[#0f172a]">{errorCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#e2d9cb] bg-white">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-4 border-b border-[#efe7da] bg-[#f8f3ea] px-6 py-4 text-xs uppercase tracking-[0.18em] text-slate-500">
          <span>Source</span>
          <span>Type</span>
          <span>Status</span>
          <span>Time</span>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-500">No logs yet.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="border-b border-[#efe7da] px-6 py-4 last:border-b-0"
            >
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-4 text-sm">
                <div className="font-medium text-[#0f172a]">{log.source}</div>
                <div className="text-slate-600">{log.event_type}</div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                      log.status
                    )}`}
                  >
                    {log.status}
                  </span>
                </div>
                <div className="text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-700">{log.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}