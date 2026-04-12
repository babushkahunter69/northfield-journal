import Link from 'next/link'

export default function WriteForUsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold">Write for Northfield Journal</h1>
      <p className="mt-4 text-lg text-neutral-700">
        We’re looking for contributors with strong ideas, clear thinking, and
        original perspective.
      </p>

      <div className="prose prose-neutral mt-10 max-w-none">
        <h2>What to send</h2>
        <ul>
          <li>A pitch or a full draft</li>
          <li>A short bio</li>
          <li>Relevant links or writing samples</li>
        </ul>

        <h2>Best fit</h2>
        <ul>
          <li>Thoughtful essays</li>
          <li>Cultural or technical analysis</li>
          <li>Reported or experience-based writing</li>
        </ul>

        <h2>Submission process</h2>
        <p>
          Create a contributor account, submit your draft, and track its editorial
          status from your dashboard.
        </p>
      </div>

      <div className="mt-10">
        <Link
          href="/register"
          className="rounded-full border px-5 py-3 text-sm font-medium"
        >
          Become a contributor
        </Link>
      </div>
    </main>
  )
}