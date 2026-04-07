import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms of use for Northfield Journal.'
};

export default function TermsPage() {
  return (
    <div className="container-shell py-14">
      <div className="mx-auto max-w-4xl paper p-8 sm:p-10">
        <h1 className="display-font text-5xl font-semibold tracking-tight text-slate-900">Terms of Use</h1>
        <div className="mt-6 space-y-4 text-slate-700">
          <p>All content published on Northfield Journal is provided for informational and educational purposes only.</p>
          <p>Guest contributors are responsible for the originality, legality, and accuracy of the material they submit.</p>
          <p>We reserve the right to edit, reject, or remove submissions at our discretion.</p>
          <p>By using this website, you agree not to misuse the site, interfere with its operation, or submit unlawful or misleading content.</p>
        </div>
      </div>
    </div>
  );
}