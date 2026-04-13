'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type Post = {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
};

export function PostEditor({ post }: { post: Post }) {
  const router = useRouter();

  const [form, setForm] = useState<Post>(post);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const inputClass =
    'w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base leading-6 text-slate-900 placeholder:text-stone-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12';

  const editor = useEditor({
    extensions: [StarterKit],
    content: form.content || '',
    onUpdate({ editor }) {
      setForm((prev) => ({
        ...prev,
        content: editor.getHTML()
      }));
    }
  });

  async function saveDraft() {
    setSaving(true);

    try {
      await fetch('/api/admin/save-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function regenerateArticle() {
    if (!form.id) return;

    const confirmed = window.confirm(
      'Regenerate article? This will overwrite current content.'
    );
    if (!confirmed) return;

    setRegenerating(true);

    try {
      const res = await fetch('/api/admin/regenerate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: form.id })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || 'Failed to regenerate.');
        return;
      }

      window.location.reload();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* ACTION BAR */}
      <div className="flex gap-3">
        <button
          onClick={regenerateArticle}
          disabled={!form.id || regenerating}
          className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-[#fffdfa] disabled:opacity-60"
        >
          {regenerating ? 'Regenerating...' : 'Regenerate Article'}
        </button>

        <button
          onClick={saveDraft}
          disabled={saving}
          className="rounded-2xl bg-[#0f172a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>

      {/* TITLE */}
      <input
        className={inputClass}
        value={form.title}
        onChange={(e) =>
          setForm({ ...form, title: e.target.value })
        }
        placeholder="Post title..."
      />

      {/* EXCERPT */}
      <textarea
        className="w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base leading-7 text-slate-900 placeholder:text-stone-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12"
        rows={3}
        value={form.excerpt}
        onChange={(e) =>
          setForm({ ...form, excerpt: e.target.value })
        }
        placeholder="Short summary..."
      />

      {/* EDITOR */}
      <div className="overflow-hidden rounded-[24px] border border-[#e2d9cb] bg-[#fffdf9] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">

        {/* Toolbar */}
        <div className="border-b border-[#e2d9cb] bg-[#f8f3ea] px-4 py-3 text-sm text-slate-600">
          Rich Text Editor
        </div>

        {/* Content */}
        <div className="bg-white px-8 py-8 text-slate-900">
          <div className="mx-auto max-w-3xl">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}