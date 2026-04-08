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

  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    if (form.content !== currentHtml) {
      editor.commands.setContent(form.content || '', false);
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

    setMessage('Saved successfully. Refresh the page to see updated ordering in the sidebar.');

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
    setMessage('Featured image uploaded.');
  }

  function insertLink() {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previousUrl || '');

    if (url === null) return;

    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="paper p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Posts
          </p>
          <button
            type="button"
            onClick={() => loadPost('new')}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
          >
            New post
          </button>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => loadPost('new')}
            className={`rounded-2xl px-4 py-3 text-left ${
              selectedId === 'new'
                ? 'bg-brand-700 text-white'
                : 'bg-stone-50 text-slate-700'
            }`}
          >
            Draft a new article
          </button>

          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => loadPost(post.id)}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                selectedId === post.id
                  ? 'bg-brand-700 text-white'
                  : 'bg-stone-50 text-slate-700 hover:bg-stone-100'
              }`}
            >
              <p className="font-semibold">{post.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">
                {post.status}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-8">
        <div className="grid gap-8 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="paper p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Content
                </p>
                <h2 className="display-font mt-2 text-3xl font-semibold text-slate-900">
                  {selectedPost ? 'Edit article' : 'Create article'}
                </h2>
              </div>
              <button
                type="button"
                onClick={autoGenerateSeo}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
              >
                Auto-fill SEO
              </button>
            </div>

            <div className="grid gap-5">
              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Slug">
                  <input
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={form.category_id}
                    onChange={(e) => updateField('category_id', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Author name">
                  <input
                    value={form.author_name}
                    onChange={(e) => updateField('author_name', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Author bio">
                  <input
                    value={form.author_bio}
                    onChange={(e) => updateField('author_bio', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                </Field>
              </div>

              <Field label="Excerpt">
                <textarea
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) => updateField('excerpt', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                />
              </Field>

              <Field label="Featured image">
                <div className="grid gap-3">
                  <input
                    value={form.featured_image_url}
                    onChange={(e) =>
                      updateField('featured_image_url', e.target.value)
                    }
                    placeholder="Paste image URL or upload below"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadImage}
                    className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm"
                  />
                  {uploading ? (
                    <p className="text-sm text-slate-500">Uploading image...</p>
                  ) : null}
                  {form.featured_image_url ? (
                    <div className="relative aspect-[16/8] overflow-hidden rounded-[20px] border border-slate-200 bg-stone-50">
                      <Image
                        src={form.featured_image_url}
                        alt={form.title || 'Featured image preview'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </Field>

              <Field label="Body">
                <div className="rounded-2xl border border-slate-300 bg-white p-4">
                  <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                    <ToolbarButton
                      type="button"
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      active={!!editor?.isActive('bold')}
                    >
                      Bold
                    </ToolbarButton>

                    <ToolbarButton
                      type="button"
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      active={!!editor?.isActive('italic')}
                    >
                      Italic
                    </ToolbarButton>

                    <ToolbarButton
                      type="button"
                      onClick={() =>
                        editor?.chain().focus().toggleHeading({ level: 2 }).run()
                      }
                      active={!!editor?.isActive('heading', { level: 2 })}
                    >
                      H2
                    </ToolbarButton>

                    <ToolbarButton
                      type="button"
                      onClick={() =>
                        editor?.chain().focus().toggleHeading({ level: 3 }).run()
                      }
                      active={!!editor?.isActive('heading', { level: 3 })}
                    >
                      H3
                    </ToolbarButton>

                    <ToolbarButton
                      type="button"
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      active={!!editor?.isActive('bulletList')}
                    >
                      List
                    </ToolbarButton>

                    <ToolbarButton
                      type="button"
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                      active={!!editor?.isActive('blockquote')}
                    >
                      Quote
                    </ToolbarButton>

                    <ToolbarButton
                      type="button"
                      onClick={insertLink}
                      active={!!editor?.isActive('link')}
                    >
                      Link
                    </ToolbarButton>
                  </div>

                  <div className="prose prose-lg max-w-none min-h-[360px] [&_.ProseMirror]:min-h-[360px] [&_.ProseMirror]:outline-none">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </Field>
            </div>
          </div>

          <div className="space-y-8">
            <div className="paper p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                SEO and publishing
              </p>
              <div className="mt-5 grid gap-5">
                <Field label="Meta title">
                  <input
                    value={form.meta_title}
                    onChange={(e) => updateField('meta_title', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Meta description">
                  <textarea
                    rows={4}
                    value={form.meta_description}
                    onChange={(e) =>
                      updateField('meta_description', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                </Field>

                <Field label="Keywords (comma-separated)">
                  <input
                    value={form.keywords}
                    onChange={(e) => updateField('keywords', e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-stone-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => updateField('is_featured', e.target.checked)}
                      className="h-4 w-4"
                    />
                    Featured post
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </span>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateField(
                          'status',
                          e.target.value as 'draft' | 'published'
                        )
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={savePost}
                  disabled={saving}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
                >
                  {saving ? 'Saving...' : form.id ? 'Save changes' : 'Create post'}
                </button>

                {message ? (
                  <p className="text-sm text-slate-600">{message}</p>
                ) : null}
              </div>
            </div>

            <div className="paper p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Live preview
              </p>
              <div className="mt-5">
                <h3 className="display-font text-4xl font-semibold text-slate-900">
                  {form.title || 'Untitled article'}
                </h3>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  {form.excerpt || 'Your excerpt will appear here.'}
                </p>
                <div
                  className="prose prose-lg mt-6 max-w-none"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              </div>
            </div>
          </div>
        </div>
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
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToolbarButton({
  children,
  active = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      {...props}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}