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
    <main>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Independent education publication
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Clear writing about learning, teaching, and the ideas shaping education.
          </h1>

          <p className="mt-6 text-lg leading-8 text-neutral-600">
            Northfield Journal publishes thoughtful articles for students, educators,
            and readers who want practical insight without jargon, hype, or filler.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/blog"
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
            >
              Read the journal
            </Link>
            <Link
              href="/guest-post"
              className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium"
            >
              Submit a guest post
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 p-6">
            <p className="text-2xl font-semibold">40+</p>
            <p className="mt-2 text-sm text-neutral-600">Contributors and guest writers</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-6">
            <p className="text-2xl font-semibold">18k</p>
            <p className="mt-2 text-sm text-neutral-600">Monthly readers across articles and search</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-6">
            <p className="text-2xl font-semibold">6.4 min</p>
            <p className="mt-2 text-sm text-neutral-600">Average time readers spend with a story</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            What you’ll find here
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Thoughtful, useful, and readable.
          </h2>
          <p className="mt-4 text-neutral-600">
            We publish articles that help readers think more clearly, teach more effectively,
            and navigate education with greater confidence.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold">Strong editorial standards</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Articles are selected and edited for clarity, substance, and usefulness.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold">Open to contributors</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Writers can submit original essays, reported pieces, and informed commentary.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold">Built for discovery</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Every article is structured to be readable, searchable, and easy to share.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Editor’s picks
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Feature stories with depth.
            </h2>
          </div>

          <Link href="/blog" className="text-sm font-medium underline underline-offset-4">
            Browse all articles
          </Link>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {featuredPosts.map((post) => (
            <article key={post.href} className="rounded-2xl border border-neutral-200 p-6">
              <p className="text-sm text-neutral-500">
                {post.category} · {post.date} · {post.readTime}
              </p>
              <h3 className="mt-3 text-2xl font-semibold">
                <Link href={post.href}>{post.title}</Link>
              </h3>
              <p className="mt-4 text-neutral-600">{post.excerpt}</p>
              <p className="mt-4 text-sm text-neutral-500">By {post.author}</p>
              <Link
                href={post.href}
                className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
              >
                Read story
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Newsletter
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Stay close to the best new writing.
            </h2>
            <p className="mt-4 max-w-xl text-neutral-600">
              Join our weekly briefing for fresh articles, standout ideas, and selected reads
              from across education.
            </p>

            <form className="mt-6 flex max-w-md gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-3 text-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Contribute
            </p>
            <h3 className="mt-3 text-2xl font-semibold">Share your perspective</h3>
            <p className="mt-4 text-neutral-600">
              We welcome thoughtful submissions from educators, students, researchers,
              and independent writers.
            </p>
            <Link
              href="/guest-post"
              className="mt-6 inline-block rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium"
            >
              Submit a guest post
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Coverage areas
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Writing for readers across education.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {coverageAreas.map((area) => (
            <div key={area.title} className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold">{area.title}</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{area.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}