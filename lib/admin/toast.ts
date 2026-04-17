export type AdminToastType = 'success' | 'error' | 'info';

export type AdminToastPayload = {
  title: string;
  description?: string;
  type?: AdminToastType;
  duration?: number;
};

const EVENT_NAME = 'northfield-admin-toast';

export function showAdminToast(payload: AdminToastPayload) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: {
        duration: 4000,
        type: 'info',
        ...payload
      }
    })
  );
}

export function getAdminToastEventName() {
  return EVENT_NAME;
}
