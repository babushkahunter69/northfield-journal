import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminLoginForm } from '@/components/admin-login-form';

export const metadata: Metadata = {
  title: 'Editor Login',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLoginPage() {
  return (
    <div className="container-shell py-16">
      <div className="mx-auto max-w-xl paper p-8 sm:p-10">
        <p className="eyebrow">Editor access</p>
        <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">Editor login</h1>
        <p className="mt-4 text-slate-600">
          Use a passwordless magic link for secure admin access to the submission dashboard and CMS editor.
        </p>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
        <div className="mt-6 text-sm text-slate-500">
          After logging in, go to{' '}
          <Link href="/admin/editor" className="font-semibold text-brand-700">
            /admin/editor
          </Link>
          {' '}for content management.
        </div>
      </div>
    </div>
  );
}