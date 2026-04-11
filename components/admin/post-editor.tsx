'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, EditorPayload, Post } from '@/lib/types';
import { excerptFromContent, makeSlug } from '@/lib/utils';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import { DeletePostButton } from '@/components/admin/delete-post-button';

const blankPost: EditorPayload & { published_at?: string } = {
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
  status: 'draft',
  published_at: ''
};

const EDITOR_PROSE =
  'journal-prose prose prose-lg max-w-none prose-p:my-4 prose-p:leading-8 prose-headings:tracking-tight prose-headings:text-[#0f172a] prose-h2:mb-4 prose-h2:mt-10 prose-h2:text-3xl prose-h2:font-semibold prose-h3:mb-3 prose-h3:mt-7 prose-h3:text-2xl prose-h3:font-semibold prose-ul:my-5 prose-ol:my-5 prose-li:my-1 prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-blockquote:text-slate-700 prose-a:text-[#9a6730] prose-a:underline prose-strong:text-[#0f172a]';

type SaveMode = 'manual-draft' | 'manual-publish' | 'autosave';

type ToastItem = {
  id: number;
  title: string;
  tone?: 'default' | 'success' | 'error';
};

function stripNofollowFromHtml(html: string) {
  return html.replace(/\srel=(["'])(.*?)\1/gi, (_match, quote, value) => {
    const cleaned = String(value)
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token.toLowerCase() !== 'nofollow');

    return cleaned.length ? ` rel=${quote}${cleaned.join(' ')}${quote}` : '';
  });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getAuthorInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'NJ';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildFormFromPost(post: Post): EditorPayload & { published_at?: string } {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: stripNofollowFromHtml(post.content),
    featured_image_url: post.featured_image_url || '',
    author_name: post.author_name,
    author_bio: post.author_bio || '',
    category_id: post.category_id || '',
    meta_title: post.meta_title || '',
    meta_description: post.meta_description || '',
    keywords: (post.keywords || []).join(', '),
    is_featured: post.is_featured,
    status: post.status,
    published_at: toDateTimeLocal((post as Post & { published_at?: string }).published_at)
  };
}

function normalizePayload(
  form: EditorPayload & { published_at?: string },
  html: string
) {
  return {
    ...form,
    content: html,
    slug: form.slug || makeSlug(form.title),
    excerpt: form.excerpt || excerptFromContent(stripHtml(html), 180),
    meta_title: form.meta_title || form.title,
    meta_description:
      form.meta_description || excerptFromContent(stripHtml(html), 155),
    published_at: form.published_at || ''
  };
}

export function PostEditor({
  categories,
  initialPost
}: {
  categories: Category[];
  initialPost?: Post | null;
}) {
  const router = useRouter();

  const [form, setForm] = useState<EditorPayload & { published_at?: string }>(() => {
    if (!initialPost) return blankPost;
    return buildFormFromPost(initialPost);
  });

  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const toastIdRef = useRef(1);
  const initialSignatureRef = useRef('');
  const redirectHandledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function showToast(
    title: string,
    tone: 'default' | 'success' | 'error' = 'default'
  ) {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, title, tone }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  }

  function updateField<K extends keyof (EditorPayload & { published_at?: string })>(
    key: K,
    value: (EditorPayload & { published_at?: string })[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer'
        }
      })
    ],
    content: form.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${EDITOR_PROSE} min-h-[420px] focus:outline-none`
      }
    },
    onUpdate: ({ editor }) => {
      const html = stripNofollowFromHtml(editor.getHTML());
      setForm((prev) => ({ ...prev, content: html }));
    }
  });

  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    if (form.content !== currentHtml) {
      editor.commands.setContent(form.content || '', {
        parseOptions: {
          preserveWhitespace: false
        }
      });
    }
  }, [editor, form.content]);

  const signature = useMemo(() => {
    return JSON.stringify({
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      featured_image_url: form.featured_image_url,
      author_name: form.author_name,
      author_bio: form.author_bio,
      category_id: form.category_id,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      keywords: form.keywords,
      is_featured: form.is_featured,
      status: form.status,
      published_at: form.published_at || ''
    });
  }, [form]);

  useEffect(() => {
    initialSignatureRef.current = signature;
  }, []);

  const isDirty = signature !== initialSignatureRef.current;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  async function saveCore(mode: SaveMode) {
    if (saving || autoSaving) return null;

    const finalContent = editor
      ? stripNofollowFromHtml(editor.getHTML())
      : stripNofollowFromHtml(form.content);

    const targetStatus = mode === 'manual-publish' ? 'published' : 'draft';

    const payload = normalizePayload(
      {
        ...form,
        status: targetStatus
      },
      finalContent
    );

    if (!payload.title.trim() || !payload.content.trim()) {
      if (mode !== 'autosave') {
        showToast('Title and body are required.', 'error');
      }
      return null;
    }

    if (mode === 'autosave') {
      setAutoSaving(true);
    } else {
      setSaving(true);
    }

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast(data?.error || 'Unable to save.', 'error');
        return null;
      }

      const nextId = data?.post?.id as string | undefined;
      const merged = nextId
        ? {
            ...payload,
            id: nextId
          }
        : payload;

      setForm(merged);
      initialSignatureRef.current = JSON.stringify({
        title: merged.title,
        slug: merged.slug,
        excerpt: merged.excerpt,
        content: merged.content,
        featured_image_url: merged.featured_image_url,
        author_name: merged.author_name,
        author_bio: merged.author_bio,
        category_id: merged.category_id,
        meta_title: merged.meta_title,
        meta_description: merged.meta_description,
        keywords: merged.keywords,
        is_featured: merged.is_featured,
        status: merged.status,
        published_at: merged.published_at || ''
      });

      setLastSavedAt(new Date());

      if (mode === 'manual-publish') {
        showToast('Post published.', 'success');
      } else if (mode === 'manual-draft') {
        showToast('Draft saved.', 'success');
      } else {
        showToast('Autosaved.', 'default');
      }

      if (nextId && !form.id && !redirectHandledRef.current) {
        redirectHandledRef.current = true;
        router.replace(`/admin/posts/${nextId}/edit`);
      } else {
        router.refresh();
      }

      return merged;
    } finally {
      setSaving(false);
      setAutoSaving(false);
    }
  }

  useEffect(() => {
    const hasMinimumContent =
      form.title.trim().length > 0 && stripHtml(form.content).trim().length > 0;

    if (!isDirty || !hasMinimumContent) return;

    const timer = window.setTimeout(() => {
      void saveCore('autosave');
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [isDirty, form.title, form.content]);

  function autoGenerateSeo() {
    const finalContent = editor
      ? stripNofollowFromHtml(editor.getHTML())
      : stripNofollowFromHtml(form.content);

    setForm((prev) => ({
      ...prev,
      slug: prev.slug || makeSlug(prev.title),
      excerpt: prev.excerpt || excerptFromContent(stripHtml(finalContent), 180),
      meta_title: prev.meta_title || prev.title,
      meta_description:
        prev.meta_description || excerptFromContent(stripHtml(finalContent), 155)
    }));

    showToast('SEO fields refreshed.', 'default');
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast(data?.error || 'Upload failed.', 'error');
        return;
      }

      setForm((prev) => ({ ...prev, featured_image_url: data.url }));
      showToast('Cover image uploaded.', 'success');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
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

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: url.trim(),
        rel: 'noopener noreferrer'
      })
      .run();
  }

  function applyHeading(level: 2 | 3) {
    if (!editor) return;
    editor.chain().focus().toggleHeading({ level }).run();
  }

  function applyBulletList() {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  }

  function applyOrderedList() {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }

  function applyBlockquote() {
    if (!editor) return;
    editor.chain().focus().toggleBlockquote().run();
  }

  async function copyLiveLink() {
    const slug = form.slug || makeSlug(form.title);
    if (!slug) {
      showToast('Save the post first to get a link.', 'error');
      return;
    }

    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://northfieldjournal.com';

    const url = `${base}/blog/${slug}`;
    await navigator.clipboard.writeText(url);
    showToast('Link copied.', 'success');
  }

  const previewCategory =
    categories.find((category) => category.id === form.category_id)?.name ||
    'Journal';

  const previewAuthorName = form.author_name || 'Editorial Team';
  const previewAuthorBio =
    form.author_bio || 'Read more from this contributor in the Northfield Journal.';
  const previewAuthorInitials = useMemo(
    () => getAuthorInitials(previewAuthorName),
    [previewAuthorName]
  );

  const liveHref = form.slug ? `/blog/${form.slug}` : null;

  return (
    <div className="space-y-8">
      <ToastStack toasts={toasts} />

      <div className="sticky top-4 z-20 rounded-[24px] border border-[#e2d9cb] bg-[rgba(255,253,248,0.92)] px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6730]">
              Publishing
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-[#0f172a]">
              {form.id ? 'Edit Post' : 'New Post'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>
                {autoSaving
                  ? 'Autosaving...'
                  : saving
                  ? 'Saving...'
                  : isDirty
                  ? 'Unsaved changes'
                  : 'All changes saved'}
              </span>
              {lastSavedAt ? (
                <span>Last saved at {lastSavedAt.toLocaleTimeString()}</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {liveHref ? (
              <>
                <Link
                  href={liveHref}
                  target="_blank"
                  className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
                >
                  View Live
                </Link>
                <button
                  type="button"
                  onClick={copyLiveLink}
                  className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#fffdfa]"
                >
                  Copy Link
                </button>
              </>
            ) : null}

            {form.id ? (
              <DeletePostButton
                postId={form.id}
                onDeleted={() => {
                  showToast('Article deleted.', 'success');
                  router.replace('/admin/posts');
                }}
              />
            ) : null}

            <button
              type="button"
              onClick={() => void saveCore('manual-draft')}
              disabled={saving || autoSaving}
              className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-[#fffdfa] disabled:opacity-60"
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => void saveCore('manual-publish')}
              disabled={saving || autoSaving}
              className="rounded-2xl bg-[#0f1b3d] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#16254f] disabled:opacity-60"
            >
              {form.id ? 'Update Live Post' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="paper p-6 sm:p-8">
        <div className="grid gap-6">
          <Field label="Title *">
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={inputClass}
              placeholder="Enter a compelling headline..."
            />
          </Field>

          <Field label="Excerpt *">
            <textarea
              rows={4}
              value={form.excerpt}
              onChange={(e) => updateField('excerpt', e.target.value)}
              className={inputClass}
              placeholder="Write a concise summary that makes readers want to keep going..."
            />
          </Field>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
            <Field label="Cover Image">
              <div className="space-y-4">
                {form.featured_image_url ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#e2d9cb] bg-stone-100">
                    <Image
                      src={form.featured_image_url}
                      alt={form.title || 'Featured image preview'}
                      fill
                      className="object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-[linear-gradient(to_top,rgba(15,23,42,0.62),transparent)] p-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-white"
                      >
                        Replace image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateField('featured_image_url', '');
                          showToast('Cover image removed.', 'default');
                        }}
                        className="rounded-full bg-red-500/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9cfbf] bg-[#fbf8f2] px-6 text-center transition hover:bg-white"
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      Upload a cover image
                    </span>
                    <span className="mt-2 text-xs leading-6 text-slate-500">
                      Choose a file from your computer to give the story a stronger first impression.
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  className="hidden"
                />

                <input
                  value={form.featured_image_url}
                  onChange={(e) =>
                    updateField('featured_image_url', e.target.value)
                  }
                  placeholder="Or paste image URL"
                  className={inputClass}
                />

                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="rounded-full bg-[#f5efe4] px-3 py-1.5">
                    {uploading ? 'Uploading image...' : 'Upload supported'}
                  </span>
                  <span className="rounded-full bg-[#f5efe4] px-3 py-1.5">
                    JPG, PNG, WebP
                  </span>
                </div>
              </div>
            </Field>

            <Field label="Category">
              <select
                value={form.category_id}
                onChange={(e) => updateField('category_id', e.target.value)}
                className={inputClass}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Author">
              <input
                value={form.author_name}
                onChange={(e) => updateField('author_name', e.target.value)}
                className={inputClass}
                placeholder="Author name"
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                className={inputClass}
                placeholder="article-slug"
              />
            </Field>

            <Field label="Author Bio">
              <input
                value={form.author_bio}
                onChange={(e) => updateField('author_bio', e.target.value)}
                className={inputClass}
                placeholder="Short contributor bio"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Body *</p>

            <button
              type="button"
              onClick={autoGenerateSeo}
              className="rounded-full border border-[#d9cfbf] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Auto-fill SEO
            </button>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#e2d9cb] bg-[#fffdfa]">
            <div className="flex flex-wrap gap-2 border-b border-[#e2d9cb] bg-[#f8f3ea] px-4 py-3">
              <ToolbarButton
                active={!!editor?.isActive('bold')}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                B
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('italic')}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                I
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('heading', { level: 2 })}
                onClick={() => applyHeading(2)}
              >
                H2
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('heading', { level: 3 })}
                onClick={() => applyHeading(3)}
              >
                H3
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('bulletList')}
                onClick={applyBulletList}
              >
                • List
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('orderedList')}
                onClick={applyOrderedList}
              >
                1. List
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('blockquote')}
                onClick={applyBlockquote}
              >
                Quote
              </ToolbarButton>

              <ToolbarButton
                active={!!editor?.isActive('link')}
                onClick={insertLink}
              >
                Link
              </ToolbarButton>
            </div>

            <div className="px-6 py-6 text-slate-800">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      <div className="paper p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          SEO and Publishing
        </p>

        <div className="mt-6 grid gap-5">
          <Field label="Meta Title">
            <input
              value={form.meta_title}
              onChange={(e) => updateField('meta_title', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Meta Description">
            <textarea
              rows={4}
              value={form.meta_description}
              onChange={(e) => updateField('meta_description', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Keywords">
            <input
              value={form.keywords}
              onChange={(e) => updateField('keywords', e.target.value)}
              className={inputClass}
              placeholder="keyword one, keyword two"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-[#e2d9cb] bg-[#fbf8f2] px-4 py-4 text-sm text-slate-700">
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
                  updateField('status', e.target.value as 'draft' | 'published')
                }
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <Field label="Publish Date">
            <input
              type="datetime-local"
              value={form.published_at || ''}
              onChange={(e) => updateField('published_at', e.target.value)}
              className={inputClass}
            />
          </Field>

          <p className="text-sm leading-7 text-slate-500">
            Set the article’s publication timestamp here. This controls the saved
            publish date used by the CMS. It does not automate future publishing yet.
          </p>
        </div>
      </div>

      <div className="paper overflow-hidden p-4 sm:p-6">
        <div className="mb-6 border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Live Preview
          </p>
          <h2 className="display-font mt-2 text-3xl font-semibold text-slate-900">
            Preview it like a reader would
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            This mirrors the public article page while keeping the editor simple.
          </p>
        </div>

        <div className="rounded-[28px] bg-[#f7f4ee] p-4 sm:p-6 lg:p-8">
          <article className="container-shell article-page py-4 sm:py-6">
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="article-main">
                <div className="paper article-shell overflow-hidden">
                  <div className="article-hero">
                    <div className="relative aspect-[16/8] overflow-hidden bg-[linear-gradient(135deg,#f3ead9,#dbc298)]">
                      {form.featured_image_url ? (
                        <Image
                          src={form.featured_image_url}
                          alt={form.title || 'Featured image preview'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-end p-10">
                          <p className="display-font text-5xl font-semibold text-slate-900/80">
                            {form.title || 'Untitled article'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-10 lg:p-12">
                    <div className="article-meta-row mb-6 flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                      <span className="text-brand-700">{previewCategory}</span>
                      <span>{form.status}</span>
                      <span>{previewAuthorName}</span>
                    </div>

                    <h1 className="display-font article-title text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                      {form.title || 'Untitled article'}
                    </h1>

                    <p className="article-dek mt-5 max-w-3xl text-xl leading-9 text-slate-600">
                      {form.excerpt || 'Your excerpt will appear here.'}
                    </p>

                    <div className="article-author-card mt-8 block rounded-[28px] border border-slate-200 bg-stone-50 p-5">
                      <div className="flex items-start gap-4">
                        <div className="article-author-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                          {previewAuthorInitials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                            Contributor
                          </p>
                          <h2 className="mt-2 text-xl font-semibold text-slate-900">
                            {previewAuthorName}
                          </h2>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {previewAuthorBio}
                          </p>

                          <span className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700">
                            View contributor page →
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="journal-prose prose prose-lg mt-12 max-w-none prose-p:my-4 prose-p:leading-8 prose-headings:tracking-tight prose-h2:mb-4 prose-h2:mt-10 prose-h2:text-3xl prose-h2:font-semibold prose-h3:mb-3 prose-h3:mt-7 prose-h3:text-2xl prose-h3:font-semibold prose-ul:my-5 prose-ol:my-5 prose-li:my-1 prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-a:text-brand-700 prose-a:underline prose-strong:text-slate-900"
                      dangerouslySetInnerHTML={{
                        __html: stripNofollowFromHtml(form.content)
                      }}
                    />

                    <div className="article-end-cta mt-14 border-t border-slate-200 pt-8">
                      <p className="text-sm uppercase tracking-[0.18em] text-brand-700">
                        Continue the conversation
                      </p>
                      <h2 className="display-font mt-4 text-3xl font-semibold text-slate-900">
                        Enjoyed this article?
                      </h2>
                      <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                        Share your perspective with Northfield Journal. We welcome
                        clear, practical, and thoughtful writing from educators,
                        tutors, researchers, and contributors.
                      </p>
                      <div className="mt-6">
                        <Link
                          href="/guest-post"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700"
                        >
                          Contribute to the journal →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="paper p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                    About this preview
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    This preview mirrors the public article feel much more closely
                    than the old compact card layout.
                  </p>
                </div>

                <div className="paper p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                    Contributor
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Written by {previewAuthorName}
                    {form.author_bio ? ` — ${form.author_bio}` : '.'}
                  </p>
                </div>

                <div className="paper p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                    For readers
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Save ideas that matter, share them with your team, and return
                    when you need a sharper perspective.
                  </p>
                </div>
              </aside>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-[#d6cebf] bg-[#fffdfa] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12';

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
  onClick
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-[#0f1b3d] text-white'
          : 'border border-[#d9cfbf] bg-white text-slate-700 hover:bg-[#fffdfa]'
      }`}
    >
      {children}
    </button>
  );
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed right-5 top-5 z-[60] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.12)] ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-white text-emerald-700'
              : toast.tone === 'error'
              ? 'border-red-200 bg-white text-red-700'
              : 'border-[#e2d9cb] bg-white text-slate-700'
          }`}
        >
          <p className="text-sm font-semibold">{toast.title}</p>
        </div>
      ))}
    </div>
  );
}