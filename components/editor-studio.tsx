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
  const [saving, setSaving] = useState(false);

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
     LOAD POST
  ========================= */

  function loadPost(id: string) {
    setSelectedId(id);

    if (id === 'new') {
      setForm(blankPost);
      return;
    }

    const post = posts.find((p) => p.id === id);
    if (!post) return;

    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image_url: post.featured_image_url || '',
      author_name: post.author_name,
      author_bio: post.author_bio || '',
      category_id: post.category_id || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      keywords: (post.keywords || []).join(', '),
      is_featured: post.is_featured,
      status: post.status
    });
  }

  /* =========================
     EDITOR COMMANDS (FIXED)
  ========================= */

  function applyHeading(level: 2 | 3) {
    editor?.chain().focus().setParagraph().toggleHeading({ level }).run();
  }

  function applyList() {
    editor?.chain().focus().toggleBulletList().run();
  }

  function applyQuote() {
    editor?.chain().focus().toggleBlockquote().run();
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
    setSaving(true);

    const payload = {
      ...form,
      slug: form.slug || makeSlug(form.title),
      excerpt:
        form.excerpt ||
        excerptFromContent(stripHtml(form.content), 180)
    };

    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setSaving(false);

    if (!res.ok) {
      setMessage('Save failed');
      return;
    }

    setMessage('Saved');
  }

  /* =========================
     DELETE
  ========================= */

  async function deletePost() {
    if (!form.id) return;

    const confirmed = window.confirm(
      'Delete this article permanently?'
    );
    if (!confirmed) return;

    const res = await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: form.id })
    });

    if (!res.ok) {
      setMessage('Delete failed');
      return;
    }

    setMessage('Deleted');

    setSelectedId('new');
    setForm(blankPost);

    window.location.reload();
  }

  return (
    <div className="space-y-10">

      {/* ================= SIDEBAR ================= */}

      <div className="grid gap-8 xl:grid-cols-[300px_1fr]">

        <aside className="paper p-4 space-y-2">
          <button onClick={() => loadPost('new')}>
            New post
          </button>

          {posts.map((p) => (
            <button key={p.id} onClick={() => loadPost(p.id)}>
              {p.title}
            </button>
          ))}
        </aside>

        {/* ================= EDITOR ================= */}

        <div className="space-y-6">

          <div className="paper p-6 space-y-6">

            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                updateField('title', e.target.value)
              }
            />

            <textarea
              placeholder="Excerpt"
              value={form.excerpt}
              onChange={(e) =>
                updateField('excerpt', e.target.value)
              }
            />

            <div className="flex gap-2">
              <button onClick={() => setMode('html')}>HTML</button>
              <button onClick={() => setMode('visual')}>
                Visual
              </button>
            </div>

            {mode === 'html' ? (
              <textarea
                rows={16}
                value={form.content}
                onChange={(e) =>
                  updateField('content', e.target.value)
                }
              />
            ) : (
              <div className="border rounded-2xl">

                <div className="flex gap-2 p-3 border-b">
                  <button onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
                  <button onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
                  <button onClick={() => applyHeading(2)}>H2</button>
                  <button onClick={() => applyHeading(3)}>H3</button>
                  <button onClick={applyList}>List</button>
                  <button onClick={applyQuote}>Quote</button>
                  <button onClick={insertLink}>Link</button>
                </div>

                <div className="p-5 min-h-[300px]">
                  <EditorContent editor={editor} />
                </div>
              </div>
            )}

            {/* SAVE + DELETE */}
            <div className="flex gap-3">
              <button
                onClick={savePost}
                className="button-primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              {form.id && (
                <button
                  onClick={deletePost}
                  className="button-secondary text-red-600"
                >
                  Delete
                </button>
              )}
            </div>

            {message && <p>{message}</p>}
          </div>

        </div>
      </div>

      {/* ================= FULL PREVIEW ================= */}

      <article className="container-shell article-page py-12">

        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_320px]">

          <div>
            <div className="paper overflow-hidden">

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

              <div className="p-10">

                <h1 className="display-font text-5xl">
                  {form.title || 'Untitled'}
                </h1>

                <p className="mt-4 text-xl text-slate-600">
                  {form.excerpt}
                </p>

                <div
                  className={`${ARTICLE_PROSE} mt-10`}
                  dangerouslySetInnerHTML={{
                    __html: form.content
                  }}
                />

              </div>
            </div>
          </div>

          <aside>
            <div className="paper p-6">
              Sidebar preview
            </div>
          </aside>

        </div>
      </article>
    </div>
  );
}