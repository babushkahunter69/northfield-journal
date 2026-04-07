import Link from "next/link";

export const metadata = {
  title: "Northfield Journal | Ideas, stories, and commentary on education",
  description:
    "Northfield Journal publishes thoughtful writing on student success, teaching craft, education systems, and practical EdTech.",
};

const featuredPosts = [
  {
    category: "Student Success",
    date: "Apr 7, 2026",
    readTime: "5 min read",
    title: "How to Build a Weekly Study Routine That Actually Sticks",
    excerpt:
      "A practical framework students can use to study consistently without turning every evening into a guilt spiral.",
    author: "Editorial Team",
    href: "/blog/how-to-build-a-weekly-study-routine-that-actually-sticks",
  },
  {
    category: "Teaching Craft",
    date: "Apr 5, 2026",
    readTime: "4 min read",
    title: "What Good Formative Assessment Looks Like in a Busy Classroom",
    excerpt:
      "Fast, low-friction ways teachers can check understanding without turning every lesson into a paperwork exercise.",
    author: "Maya Ellison",
    href: "/blog/what-good-formative-assessment-looks-like-in-a-busy-classroom",
  },
];

const coverageAreas = [
  {
    title: "Student success",
    text: "Study systems, revision habits, focus, memory, exam prep, and academic confidence.",
  },
  {
    title: "Teaching craft",
    text: "Lesson design, formative assessment, classroom culture, tutoring, and practical pedagogy.",
  },
  {
    title: "Education systems",
    text: "School leadership, parent communication, scholarships, college access, and clear policy explainers.",
  },
  {
    title: "EdTech that helps",
    text: "Careful, non-hype coverage of digital tools that genuinely improve learning outcomes.",
  },
];

export default function HomePage() {
  return (
    <main className="bg-gradient-to-b from-amber-50 via-white to-orange-50 text-neutral-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-[-80px] h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute top-20 right-[-60px] h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="absolute bottom-[-80px] left-1/3 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-amber-300/70 bg-white/80 px-4 py-1.5 text-sm font-medium uppercase tracking-[0.2em] text-amber-800 shadow-sm backdrop-blur">
              Independent education publication
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-neutral-950 sm:text-6xl">
              Clear writing about learning, teaching, and the ideas shaping education.
            </h1>

            <p className="mt-6 text-lg leading-8 text-neutral-700">
              Northfield Journal publishes thoughtful articles for students, educators,
              and readers who want practical insight without jargon, hype, or filler.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/blog"
                className="rounded-full bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-amber-200 transition hover:scale-[1.02] hover:from-amber-700 hover:to-orange-600"
              >
                Read the journal
              </Link>
              <Link
                href="/guest-post"
                className="rounded-full border border-amber-300 bg-white/90 px-6 py-3 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-50"
              >
                Submit a guest post
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border border-amber-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <p className="text-2xl font-semibold text-amber-700">40+</p>
              <p className="mt-2 text-sm text-neutral-600">Contributors and guest writers</p>
            </div>
            <div className="rounded-3xl border border-orange-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <p className="text-2xl font-semibold text-orange-700">18k</p>
              <p className="mt-2 text-sm text-neutral-600">Monthly readers across articles and search</p>
            </div>
            <div className="rounded-3xl border border-rose-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <p className="text-2xl font-semibold text-rose-700">6.4 min</p>
              <p className="mt-2 text-sm text-neutral-600">Average time readers spend with a story</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
            What you’ll find here
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
            Thoughtful, useful, and readable.
          </h2>
          <p className="mt-4 text-neutral-700">
            We publish articles that help readers think more clearly, teach more effectively,
            and navigate education with greater confidence.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
  About this article
</p>

<p className="mt-3 text-sm leading-7 text-slate-600">
  This article was written to be clear, practical, and useful for readers.
</p>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-white to-orange-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-950">Open to contributors</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Writers can submit original essays, reported pieces, and informed commentary.
            </p>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-white to-rose-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-950">Built for discovery</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Every article is structured to be readable, searchable, and easy to share.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">
              Editor’s picks
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
              Feature stories with depth.
            </h2>
          </div>

          <Link
            href="/blog"
            className="text-sm font-medium text-amber-800 underline underline-offset-4"
          >
            Browse all articles
          </Link>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {featuredPosts.map((post, index) => (
            <article
              key={post.href}
              className={`rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                index === 0
                  ? "border-amber-200 bg-gradient-to-br from-white to-amber-50"
                  : "border-orange-200 bg-gradient-to-br from-white to-orange-50"
              }`}
            >
              <p className="text-sm text-neutral-500">
                {post.category} · {post.date} · {post.readTime}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-neutral-950">
                <Link href={post.href}>{post.title}</Link>
              </h3>
              <p className="mt-4 text-neutral-700">{post.excerpt}</p>
              <p className="mt-4 text-sm text-neutral-500">By {post.author}</p>
              <Link
                href={post.href}
                className="mt-6 inline-block text-sm font-medium text-amber-800 underline underline-offset-4"
              >
                Read story
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
              Newsletter
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
              Stay close to the best new writing.
            </h2>
            <p className="mt-4 max-w-xl text-neutral-700">
              Join our weekly briefing for fresh articles, standout ideas, and selected reads
              from across education.
            </p>

            <form className="mt-6 flex max-w-md gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-full border border-amber-300 bg-white px-4 py-3 text-sm shadow-sm outline-none placeholder:text-neutral-400 focus:border-amber-500"
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-amber-600 to-orange-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-amber-200 transition hover:from-amber-700 hover:to-orange-600"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-white to-rose-50 p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-700">
              Contribute
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-neutral-950">Share your perspective</h3>
            <p className="mt-4 text-neutral-700">
              We welcome thoughtful submissions from educators, students, researchers,
              and independent writers.
            </p>
            <Link
              href="/guest-post"
              className="mt-6 inline-block rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-medium text-rose-800 shadow-sm transition hover:bg-rose-50"
            >
              Submit a guest post
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
            Coverage areas
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
            Writing for readers across education.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {coverageAreas.map((area, index) => (
            <div
              key={area.title}
              className={`rounded-3xl border p-6 shadow-sm ${
                index % 4 === 0
                  ? "border-amber-200 bg-gradient-to-br from-white to-amber-50"
                  : index % 4 === 1
                  ? "border-orange-200 bg-gradient-to-br from-white to-orange-50"
                  : index % 4 === 2
                  ? "border-rose-200 bg-gradient-to-br from-white to-rose-50"
                  : "border-yellow-200 bg-gradient-to-br from-white to-yellow-50"
              }`}
            >
              <h3 className="text-lg font-semibold text-neutral-950">{area.title}</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{area.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}