'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminToastEventName, type AdminToastPayload } from '@/lib/admin/toast';

type ToastItem = Required<Pick<AdminToastPayload, 'title' | 'type' | 'duration'>> & {
  id: string;
  description?: string;
};

function toastClasses(type: ToastItem['type']) {
  if (type === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  }

  if (type === 'error') {
    return 'border-red-200 bg-red-50 text-red-950';
  }

  return 'border-[#d9cfbf] bg-white text-slate-900';
}

export function AdminToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const customEvent = event as CustomEvent<AdminToastPayload>;
      const detail = customEvent.detail;

      const toast: ToastItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: detail.title,
        description: detail.description,
        type: detail.type || 'info',
        duration: detail.duration || 4000
      };

      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.duration);
    }

    const eventName = getAdminToastEventName();
    window.addEventListener(eventName, onToast as EventListener);

    return () => {
      window.removeEventListener(eventName, onToast as EventListener);
    };
  }, []);

  const visibleToasts = useMemo(() => toasts.slice(-4), [toasts]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-3">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ${toastClasses(toast.type)}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm leading-6 opacity-80">{toast.description}</p>
              ) : null}
            </div>

            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
