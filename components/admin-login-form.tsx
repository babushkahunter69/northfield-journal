'use client';

import { useActionState } from 'react';
import { signInWithMagicLink } from '@/app/actions';

const initialState = { error: '', success: '' };

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(signInWithMagicLink as any, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Admin email</label>
        <input
          name="email"
          type="email"
          required
          className="input-field"
        />
      </div>
      <button
        disabled={pending}
        className="button-primary rounded-2xl"
      >
        {pending ? 'Sending link...' : 'Send magic link'}
      </button>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
    </form>
  );
}