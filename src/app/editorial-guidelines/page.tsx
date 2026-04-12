export default function EditorialGuidelinesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold">Editorial Guidelines</h1>

      <div className="prose prose-neutral mt-10 max-w-none">
        <p>
          Northfield Journal publishes thoughtful, well-structured, well-researched
          writing. We prioritize clarity, originality, style, and intellectual honesty.
        </p>

        <h2>What we publish</h2>
        <ul>
          <li>Essays</li>
          <li>Analysis</li>
          <li>Criticism</li>
          <li>Experience-backed guides</li>
        </ul>

        <h2>What we avoid</h2>
        <ul>
          <li>Generic SEO filler</li>
          <li>Undisclosed promotion</li>
          <li>Plagiarism</li>
          <li>Thin AI-generated writing</li>
        </ul>

        <h2>Requirements</h2>
        <ul>
          <li>800–2,500 words</li>
          <li>Clear argument or takeaway</li>
          <li>Original work only</li>
          <li>Credible sourcing where appropriate</li>
        </ul>

        <h2>Editing policy</h2>
        <p>
          Submissions may be edited for structure, clarity, tone, and accuracy.
          Major edits are reviewed with the author.
        </p>
      </div>
    </main>
  )
}