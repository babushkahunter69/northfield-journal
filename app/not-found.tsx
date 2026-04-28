export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f1ea] text-[#1a1a1a] px-6">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-serif mb-4">Page not found</h1>

        <p className="text-lg text-gray-600 mb-6">
          This article may still be a draft or the link is incorrect.
        </p>

        <a
          href="/journal"
          className="inline-block px-6 py-3 bg-[#1a1a1a] text-white rounded-lg"
        >
          Back to Journal
        </a>
      </div>
    </div>
  )
}