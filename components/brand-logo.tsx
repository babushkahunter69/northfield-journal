import Link from 'next/link';
import { cn } from '@/lib/utils';

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-3', className)}>
      <span className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-brand-300 bg-[radial-gradient(circle_at_top,#d9bf86,#8c6836_62%,#221b11)] shadow-[inset_0_1px_8px_rgba(255,255,255,0.2)]">
        <svg viewBox="0 0 64 64" className="h-7 w-7 text-white" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M18 48V16h6l16 20V16h6v32h-5.5L24 27v21h-6Z" fill="currentColor"/>
        </svg>
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="display-font block text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Northfield <span className="text-brand-700 dark:text-brand-300">Journal</span>
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 md:block">
            Education, carefully edited
          </span>
        </span>
      ) : null}
    </Link>
  );
}
