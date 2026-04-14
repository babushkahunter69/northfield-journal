import { RichContent } from '@/components/rich-content';

type PostPreviewProps = {
  title: string;
  excerpt: string;
  content: string;
};

export function PostPreview({ title, excerpt, content }: PostPreviewProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e2d9cb] bg-[#fffdf9] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[#e2d9cb] bg-[#f8f3ea] px-4 py-3 text-sm font-semibold text-slate-600">
        Article Preview
      </div>

      <div className="bg-white px-8 py-10">
        <article className="mx-auto max-w-3xl">
          <h1 className="display-font text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {title || 'Untitled article'}
          </h1>

          {excerpt ? (
            <p className="mt-5 max-w-3xl text-xl leading-9 text-slate-600">
              {excerpt}
            </p>
          ) : null}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <RichContent content={content} />
          </div>
        </article>
      </div>
    </div>
  );
}