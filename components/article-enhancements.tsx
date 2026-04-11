'use client';

import { useEffect, useMemo, useState } from 'react';

export function ArticleEnhancements({
  title,
  url
}: {
  title: string;
  url: string;
}) {
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function updateProgress() {
      const article = document.querySelector('.article-main');
      if (!article) {
        setProgress(0);
        return;
      }

      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = article.scrollHeight;
      const viewportHeight = window.innerHeight;

      const scrollable = Math.max(articleHeight - viewportHeight, 1);
      const current = window.scrollY - articleTop;
      const next = Math.min(Math.max((current / scrollable) * 100, 0), 100);

      setProgress(next);
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    return {
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    };
  }, [title, url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] h-[4px] bg-transparent">
        <div
          className="h-full bg-[#9a6730] transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="fixed bottom-5 right-5 z-[65] hidden md:block">
        <div className="rounded-[22px] border border-[#e2d9cb] bg-[rgba(255,253,248,0.96)] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Share
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>

            <a
              href={shareLinks.x}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
            >
              X
            </a>

            <a
              href={shareLinks.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
            >
              LinkedIn
            </a>

            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#d9cfbf] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
    </>
  );
}