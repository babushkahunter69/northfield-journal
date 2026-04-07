import type { Metadata } from 'next';
import { GuestPostForm } from '@/components/guest-post-form';
import { guestPostRules } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Contribute',
  description: 'Pitch a thoughtful education article to Northfield Journal. Review the editorial brief and submit your contribution.'
};

export default function GuestPostPage() {
  return (
    <div className="container-shell py-14">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <div className="paper p-7">
            <span className="eyebrow">Contribute</span>
            <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">Pitch the kind of education article people actually remember</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              We welcome teachers, tutors, researchers, coaches, school leaders, counselors, and informed practitioners.
              The strongest submissions have a distinct point of view and something real to say.
            </p>
          </div>

          <div className="paper p-7">
            <h2 className="text-xl font-bold text-slate-900">What the editor is looking for</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              {guestPostRules.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-brand-700" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="paper p-7">
            <h2 className="text-xl font-bold text-slate-900">Before you hit submit</h2>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600">
              <p>Bring a clear thesis, not a vague topic.</p>
              <p>Use examples, screenshots, anecdotes, or sources that make the piece feel lived-in.</p>
              <p>Strip out filler, keyword stuffing, and generic intros.</p>
              <p>The admin dashboard lets you review, reject, or publish accepted submissions instantly.</p>
            </div>
          </div>
        </section>

        <GuestPostForm />
      </div>
    </div>
  );
}
