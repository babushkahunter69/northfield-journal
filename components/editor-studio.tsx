'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { Category, EditorPayload, Post } from '@/lib/types';
import { excerptFromContent, makeSlug } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const blankPost: EditorPayload = {
title: '',
slug: '',
excerpt: '',
content:
'<h2>Start writing</h2><p>Use headings, paragraphs, lists, links, and quotes.</p>',
featured_image_url: '',
author_name: 'Editorial Team',
author_bio: '',
category_id: '',
meta_title: '',
meta_description: '',
keywords: '',
is_featured: false,
status: 'draft'
};

const ARTICLE_PROSE =
'journal-prose prose prose-lg max-w-none prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-3xl prose-h3:mt-7 prose-h3:text-2xl prose-p:my-4 prose-p:leading-8 prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:pl-5';

function stripHtml(html: string) {
return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function EditorStudio({
posts,
categories
}: {
posts: Post[];
categories: Category[];
}) {
const [selectedId, setSelectedId] = useState<string>('new');
const [form, setForm] = useState<EditorPayload>(blankPost);
const [mode, setMode] = useState<'html' | 'visual'>('html');
const [message, setMessage] = useState('');

const selectedPost = useMemo(
() => posts.find((post) => post.id === selectedId),
[posts, selectedId]
);

function updateField<K extends keyof EditorPayload>(
key: K,
value: EditorPayload[K]
) {
setForm((prev) => ({ ...prev, [key]: value }));
}

const editor = useEditor({
extensions: [StarterKit, Link],
content: form.content,
onUpdate: ({ editor }) => {
if (mode === 'visual') {
setForm((prev) => ({ ...prev, content: editor.getHTML() }));
}
}
});

/* =========================
FIXED TOOLBAR ACTIONS
========================= */

const run = (fn: () => void) => {
if (!editor) return;
editor.chain().focus();
fn();
};

function applyH2() {
run(() =>
editor
?.chain()
.focus()
.setParagraph()
.toggleHeading({ level: 2 })
.run()
);
}

function applyH3() {
run(() =>
editor
?.chain()
.focus()
.setParagraph()
.toggleHeading({ level: 3 })
.run()
);
}

function applyList() {
run(() =>
editor?.chain().focus().toggleBulletList().run()
);
}

function applyQuote() {
run(() =>
editor?.chain().focus().toggleBlockquote().run()
);
}

function insertLink() {
if (!editor) return;
const url = window.prompt('Enter URL');
if (!url) return;
editor.chain().focus().setLink({ href: url }).run();
}

/* =========================
SAVE
========================= */

async function savePost() {
const payload = {
...form,
slug: form.slug || makeSlug(form.title),
excerpt: form.excerpt || excerptFromContent(stripHtml(form.content), 180)
};

```
const res = await fetch('/api/admin/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

if (!res.ok) {
  setMessage('Save failed');
  return;
}

setMessage('Saved');
```

}

/* =========================
UI
========================= */

return ( <div className="space-y-10">

```
  {/* ================= EDITOR ================= */}

  <div className="paper p-6 space-y-6">
    <input
      placeholder="Article title"
      value={form.title}
      onChange={(e) => updateField('title', e.target.value)}
    />

    <textarea
      placeholder="Excerpt"
      value={form.excerpt}
      onChange={(e) => updateField('excerpt', e.target.value)}
    />

    <div className="flex gap-2">
      <button onClick={() => setMode('html')}>HTML</button>
      <button onClick={() => setMode('visual')}>Visual</button>
    </div>

    {mode === 'html' ? (
      <textarea
        rows={16}
        value={form.content}
        onChange={(e) => updateField('content', e.target.value)}
      />
    ) : (
      <div className="border rounded-2xl overflow-hidden">

        {/* toolbar */}
        <div className="flex gap-2 p-3 border-b bg-stone-50">
          <button onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
          <button onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
          <button onClick={applyH2}>H2</button>
          <button onClick={applyH3}>H3</button>
          <button onClick={applyList}>List</button>
          <button onClick={applyQuote}>Quote</button>
          <button onClick={insertLink}>Link</button>
        </div>

        <div className="p-5 min-h-[300px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    )}

    <button onClick={savePost} className="button-primary">
      Save
    </button>

    {message && <p>{message}</p>}
  </div>

  {/* ================= FULL ARTICLE PREVIEW ================= */}

  <article className="container-shell article-page py-12">

    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">

      <div>
        <div className="paper article-shell overflow-hidden">

          {/* HERO */}
          <div className="relative aspect-[16/8] bg-stone-200">
            {form.featured_image_url && (
              <Image
                src={form.featured_image_url}
                alt=""
                fill
                className="object-cover"
              />
            )}
          </div>

          <div className="p-8 lg:p-12">

            {/* META */}
            <div className="article-meta-row mb-6 text-sm uppercase tracking-[0.18em] text-slate-500">
              {form.author_name} • {form.status}
            </div>

            {/* TITLE */}
            <h1 className="display-font text-5xl font-semibold leading-tight">
              {form.title || 'Untitled article'}
            </h1>

            {/* DEK */}
            <p className="article-dek mt-5 text-xl leading-9 text-slate-600">
              {form.excerpt || 'Excerpt preview'}
            </p>

            {/* BODY */}
            <div
              className={`${ARTICLE_PROSE} mt-12`}
              dangerouslySetInnerHTML={{ __html: form.content }}
            />

          </div>
        </div>
      </div>

      {/* SIDEBAR PREVIEW */}
      <aside className="space-y-6">
        <div className="paper p-6">
          <p className="text-sm uppercase text-brand-700">
            Preview sidebar
          </p>
          <p className="mt-3 text-sm text-slate-600">
            This mimics newsletter / related content blocks.
          </p>
        </div>
      </aside>

    </div>
  </article>
</div>
```

);
}
