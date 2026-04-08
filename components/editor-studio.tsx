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
  content: '<h2>Start writing</h2><p>Use headings, paragraphs, lists, links, and quotes.</p>',
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

export function EditorStudio({
  posts,
  categories
}: {
  posts: Post[];
  categories: Category[];
}) {
  const [selectedId, setSelectedId] = useState<string>('new');
  const [form, setForm] = useState<EditorPayload>(blankPost);
  const [message, setMessage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true
      })
    ],
    content: form.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      updateField('content', editor.getHTML());
    }
  });

  // ✅ FIXED (removed invalid "false")
  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    if (form.content !== currentHtml) {
      editor.commands.setContent(form.content || '');
    }
  }, [editor, form.content]);

  function loadPost(id: string) {
    setSelectedId(id);

    if (id === 'new') {
      setForm(blankPost);
      setMessage('');
      return;
    }

    const post = posts.find((item) => item.id === id);
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

    setMessage('');
  }

  function autoGenerateSeo() {
    setForm((prev) => ({
      ...prev,
      slug: prev.slug || makeSlug(prev.title),
      excerpt: prev.excerpt || excerptFromContent(stripHtml(prev.content), 180),
      meta_title: prev.meta_title || prev.title,
      meta_description:
        prev.meta_description || excerptFromContent(stripHtml(prev.content), 155)
    }));
  }

  async function savePost() {
    setSaving(true);
    setMessage('');

    const payload = {
      ...form,
      slug: form.slug || makeSlug(form.title),
      excerpt: form.excerpt || excerptFromContent(stripHtml(form.content), 180),
      meta_title: form.meta_title || form.title,
      meta_description:
        form.meta_description || excerptFromContent(stripHtml(form.content), 155)
    };

    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.error || 'Unable to save.');
      return;
    }

    setMessage('Saved successfully.');

    if (data.post?.id) {
      setSelectedId(data.post.id);
      setForm({
        ...payload,
        id: data.post.id
      });
    }
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setMessage(data.error || 'Upload failed.');
      return;
    }

    setForm((prev) => ({ ...prev, featured_image_url: data.url }));
    setMessage('Image uploaded.');
  }

  function insertLink() {
    if (!editor) return;

    const url = window.prompt('Enter URL');

    if (!url) return;

    editor.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="paper p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase text-slate-500">Posts</p>
          <button onClick={() => loadPost('new')} className="text-xs">New</button>
        </div>

        {posts.map((post) => (
          <button key={post.id} onClick={() => loadPost(post.id)}>
            {post.title}
          </button>
        ))}
      </aside>

      <section className="space-y-6">
        <Field label="Title">
          <input
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
        </Field>

        <Field label="Body">
          <div className="border rounded-xl p-4">

            {/* Toolbar */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
              <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>List</button>
              <button onClick={insertLink}>Link</button>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
          </div>
        </Field>

        <button onClick={savePost}>
          {saving ? 'Saving...' : 'Publish'}
        </button>

        {message && <p>{message}</p>}
      </section>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p>{label}</p>
      {children}
    </label>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').trim();
}