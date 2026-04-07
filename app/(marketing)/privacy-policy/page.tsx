import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Northfield Journal.'
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container-shell py-14">
      <div className="mx-auto max-w-4xl paper p-8 sm:p-10">
        <h1 className="display-font text-5xl font-semibold tracking-tight text-slate-900">Privacy Policy</h1>
        <div className="mt-6 space-y-4 text-slate-700">
          <p>Northfield Journal may collect personal information you voluntarily submit through forms on this site, including contact details, guest post submissions, and newsletter subscriptions.</p>
          <p>We may also collect basic analytics and advertising-related data to improve the website and understand how visitors use it.</p>
          <p>We do not sell your personal information. We only use submitted information for editorial communication, site operations, and audience engagement.</p>
          <p>If you would like your information removed, contact us at <a className="font-semibold text-brand-700" href="mailto:masterstudyguide01@gmail.com">masterstudyguide01@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  );
}