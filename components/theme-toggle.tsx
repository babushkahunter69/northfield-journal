import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the Northfield Journal editorial team for submissions, corrections, sponsorships, or partnerships.'
};

export default function ContactPage() {
  return (
    <div className="container-shell py-14">
      <div className="mx-auto max-w-3xl paper p-8 sm:p-10">
        <span className="eyebrow">Contact</span>
        <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">Get in touch</h1>
        <div className="mt-6 space-y-4 text-slate-700">
          <p>
            For editorial inquiries, corrections, partnerships, or sponsorships, email{' '}
            <a className="font-semibold text-brand-700" href="mailto:masterstudyguide01@gmail.com">
              masterstudyguide01@gmail.com
            </a>.
          </p>
          <p>
            For guest contributions, use the submission form so pitches land in the dashboard rather than getting lost in inbox triage.
          </p>
        </div>
      </div>
    </div>
  );
}