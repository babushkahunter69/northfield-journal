'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, EditorPayload, Post } from '@/lib/types';
import { excerptFromContent, makeSlug } from '@/lib/utils';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import { DeletePostButton } from '@/components/admin/delete-post-button';

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
  'journal-prose prose prose-lg max-w-none prose-p:my-4 prose-p:leading-8 prose-headings:tracking-tight prose-h2:mb-4 prose-h2:mt-10 prose-h2:text-3xl prose-h2:font-semibold prose-h3:mb-3 prose-h3:mt-7 prose-h3:text-2xl prose-h3:font-semibold prose-ul:my-5 prose-ol:my-5 prose-li:my-1 prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-a:text-brand-700 prose-a:underline prose-strong:text-slate-900';

type EditorMode = 'visual' | 'html';

function stripNofollowFromHtml(html: string) {
  return html.replace(/\srel=(["'])(.*?)\1/gi, (_match, quote, value) => {
    const cleaned = String(value)
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token.toLowerCase() !== 'nofollow');

    return cleaned.length ? ` rel=${quote}${cleaned.join(' ')}${quote}` : '';
  });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanTiptapHtml(input: string) {
  if (!input || typeof window === 'undefined') return input || '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');

  const allowedTags = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'blockquote',
    'strong',
    'b',
    'em',
    'i',
    'a',
    'br'
  ]);

  const unwrapTags = new Set([
    'div',
    'section',
    'article',
    'main',
    'header',
    'footer',
    'span',
    'font'
  ]);

  function cleanNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'script' || tag === 'style' || tag === 'meta') {
      return '';
    }

    const children = Array.from(el.childNodes).map(cleanNode).join('');

    if (unwrapTags.has(tag)) return children;
    if (!allowedTags.has(tag)) return children;

    if (tag === 'a') {
      const rawHref = el.getAttribute('href')?.trim() || '';
      const safeHref =
        rawHref.startsWith('http://') ||
        rawHref.startsWith('https://') ||
        rawHref.startsWith('/') ||
        rawHref.startsWith('#')
          ? rawHref
          : '';

      if (!safeHref) return children;

      return `<a href="${escapeHtml(
        safeHref
      )}" rel="noopener noreferrer">${children}</a>`;
    }

    if (tag === 'strong' || tag === 'b') return `<strong>${children}</strong>`;
    if (tag === 'em' || tag === 'i') return `<em>${children}</em>`;
    if (tag === 'br') return '<br>';

    if (tag === 'p') {
      const textOnly = normalizeText(el.textContent ?? '');
      if (!textOnly && !children.includes('<br>')) return '';
      return `<p>${children}</p>`;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const textOnly = normalizeText(el.textContent ?? '');
      if (!textOnly) return '';
      return `<${tag}>${children}</${tag}>`;
    }

    if (tag === 'blockquote') {
      const textOnly = normalizeText(el.textContent ?? '');
      if (!textOnly) return '';
      return `<blockquote>${children}</blockquote>`;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((child) => cleanNode(child))
        .join('');

      return items ? `<${tag}>${items}</${tag}>` : '';
    }

    if (tag === 'li') {
      const textOnly = normalizeText(el.textContent ?? '');
      if (!textOnly) return '';
      return `<li>${children}</li>`;
    }

    return children;
  }

  let html = Array.from(doc.body.childNodes).map(cleanNode).join('');

  html = html
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<h1>\s*<\/h1>/g, '')
    .replace(/<h2>\s*<\/h2>/g, '')
    .replace(/<h3>\s*<\/h3>/g, '')
    .replace(/\n+/g, '')
    .trim();

  return stripNofollowFromHtml(html);
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

export function PostEditor({
  categories,
  initialPost
}: {
  categories: Category[];
  initialPost?: Post | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<EditorMode>('html');
  const [form, setForm] = useState<EditorPayload>(() => {
    if (!initialPost) return blankPost;

    return {
      id: initialPost.id,
      title: initialPost.title,
      slug: initialPost.slug,
      excerpt: initialPost.excerpt,
      content: stripNofollowFromHtml(initialPost.content),
      featured_image_url: initialPost.featured_image_url || '',
      author_name: initialPost.author_name,
      author_bio: initialPost.author_bio || '',
      category_id: initialPost.category_id || '',
      meta_title: initialPost.meta_title || '',
      meta_description: initialPost.meta_description || '',
      keywords: (initialPost.keywords || []).join(', '),
      is_featured: initialPost.is_featured,
      status: initialPost.status
    };
  });

  function updateField<K extends keyof EditorPayload>(
    key: K,
    value: EditorPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
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
        class: `${ARTICLE_PROSE} focus:outline-none`
      },
      handlePaste(_view, event) {
        const html = event.clipboardData?.getData('text/html');
        if (!html || !editor) return false;

        event.preventDefault();

        const cleaned = cleanTiptapHtml(html) || '<p></p>';

        editor.commands.insertContent(cleaned, {
          parseOptions: {
            preserveWhitespace: false
          }
        });

        setForm((prev) => ({ ...prev, content: editor.getHTML() }));
        setMessage('Pasted content was cleaned automatically.');
        return true;
      }
    },
    onUpdate: ({ editor }) => {
      if (mode === 'visual') {
        const html = stripNofollowFromHtml(editor.getHTML());
        setForm((prev) => ({ ...prev, content: html }));
      }
    }
  });

  useEffect(() => {
    if (!editor || mode !== 'visual') return;

    const currentHtml = editor.getHTML();
    if (form.content !== currentHtml) {
      editor.commands.setContent(form.content || '', {
        parseOptions: {
          preserveWhitespace: false
        }
      });
    }
  }, [editor, form.content, mode]);

  function switchToVisualMode() {
    if (!editor) {
      setMode('visual');
      return;
    }

    const cleaned = cleanTiptapHtml(form.content || '<p></p>');
    editor.commands.setContent(cleaned, {
      parseOptions: {
        preserveWhitespace: false
      }
    });

    setForm((prev) => ({ ...prev, content: cleaned }));
    setMode('visual');
    setMessage('Switched to visual editor.');
  }

  function switchToHtmlMode() {
    if (editor) {
      const html = stripNofollowFromHtml(editor.getHTML());
      setForm((prev) => ({ ...prev, content: html }));
    }

    setMode('html');
    setMessage('Switched to HTML editor.');
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

  async function savePost(nextStatus?: 'draft' | 'published') {
    setSaving(true);
    setMessage('');

    const finalContent =
      mode === 'visual' && editor
        ? stripNofollowFromHtml(editor.getHTML())
        : stripNofollowFromHtml(form.content);

    const status = nextStatus || form.status;

    const payload = {
      ...form,
      status,
      content: finalContent,
      slug: form.slug || makeSlug(form.title),
      excerpt: form.excerpt || excerptFromContent(stripHtml(finalContent), 180),
      meta_title: form.meta_title || form.title,
      meta_description:
        form.meta_description || excerptFromContent(stripHtml(finalContent), 155)
    };

    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setMessage(data?.error || 'Unable to save.');
      return;
    }

    if (data?.post?.id) {
      const nextId = data.post.id;
      setForm((prev) => ({
        ...prev,
        ...payload,
        id: nextId
      }));

      if (!form.id) {
        router.push(`/admin/posts/${nextId}/edit`);
      } else {
        router.refresh();
      }
    }

    setMessage(
      status === 'published'
        ? 'Post published successfully.'
        : 'Draft saved successfully.'
    );
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

    const data = await res.json().catch(() => null);
    setUploading(false);

    if (!res.ok) {
      setMessage(data?.error || 'Upload failed.');
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
    editor.chain().focus().setParagraph().toggleHeading({ level }).run();
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e0bb42]">
            Publishing
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-white">
            {form.id ? 'Edit Post' : 'New Post'}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-white/60">
            Write, refine, and publish an article that matches the Northfield Journal
            brand.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {form.id ? <DeletePostButton postId={form.id} /> : null}
          <button
            type="button"
            onClick={() => savePost('draft')}
            disabled={saving}
            className="rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => savePost('published')}
            disabled={saving}
            className="rounded-2xl bg-[#e0bb42] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-black transition hover:brightness-105 disabled:opacity-60"
          >
            {form.id ? 'Update Live Post' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0d0d0d] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="grid gap-6">
          <Field label="Title *" dark>
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={inputClass}
              placeholder="Enter a compelling headline..."
            />
          </Field>

          <Field label="Excerpt *" dark>
            <textarea
              rows={4}
              value={form.excerpt}
              onChange={(e) => updateField('excerpt', e.target.value)}
              className={inputClass}
              placeholder="Write a concise summary that makes readers want to keep going..."
            />
          </Field>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <Field label="Cover Image" dark>
              <div className="space-y-3">
                {form.featured_image_url ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <Image
                      src={form.featured_image_url}
                      alt={form.title || 'Featured image preview'}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#090909] text-sm text-white/35">
                    No image selected
                  </div>
                )}

                <input
                  value={form.featured_image_url}
                  onChange={(e) =>
                    updateField('featured_image_url', e.target.value)
                  }
                  placeholder="Paste image URL"
                  className={inputClass}
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  className="block w-full text-sm text-white/55 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-medium file:text-white"
                />

                {uploading ? (
                  <p className="text-sm text-white/45">Uploading image...</p>
                ) : null}
              </div>
            </Field>

            <Field label="Category" dark>
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

            <Field label="Author" dark>
              <input
                value={form.author_name}
                onChange={(e) => updateField('author_name', e.target.value)}
                className={inputClass}
                placeholder="Author name"
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Slug" dark>
              <input
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                className={inputClass}
                placeholder="article-slug"
              />
            </Field>

            <Field label="Author Bio" dark>
              <input
                value={form.author_bio}
                onChange={(e) => updateField('author_bio', e.target.value)}
                className={inputClass}
                placeholder="Short contributor bio"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Field label="Body *" dark>
              <div />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={autoGenerateSeo}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/5 hover:text-white"
              >
                Auto-fill SEO
              </button>

              <button
                type="button"
                onClick={switchToHtmlMode}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === 'html'
                    ? 'bg-white text-black'
                    : 'border border-white/10 text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                HTML
              </button>

              <button
                type="button"
                onClick={switchToVisualMode}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === 'visual'
                    ? 'bg-white text-black'
                    : 'border border-white/10 text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                Visual
              </button>
            </div>
          </div>

          {mode === 'html' ? (
            <textarea
              rows={18}
              value={form.content}
              onChange={(e) =>
                updateField('content', stripNofollowFromHtml(e.target.value))
              }
              placeholder="<h2>Section</h2><p>Paragraph...</p>"
              className={`${inputClass} font-mono text-sm leading-7`}
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111111]">
              <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
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

              <div className="min-h-[420px] px-6 py-6 text-white">
                <EditorContent editor={editor} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0d0d0d] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
          SEO and Publishing
        </p>

        <div className="mt-6 grid gap-5">
          <Field label="Meta Title" dark>
            <input
              value={form.meta_title}
              onChange={(e) => updateField('meta_title', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Meta Description" dark>
            <textarea
              rows={4}
              value={form.meta_description}
              onChange={(e) => updateField('meta_description', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Keywords" dark>
            <input
              value={form.keywords}
              onChange={(e) => updateField('keywords', e.target.value)}
              className={inputClass}
              placeholder="keyword one, keyword two"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/75">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => updateField('is_featured', e.target.checked)}
                className="h-4 w-4"
              />
              Featured post
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white/75">
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

          {message ? <p className="text-sm text-white/55">{message}</p> : null}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0d0d0d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="mb-6 border-b border-white/10 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
            Live Preview
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-white">
            Preview it like a reader would
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
            This mirrors the public article page much more closely while keeping
            HTML mode as the reliable editing workflow.
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
                      className={`${ARTICLE_PROSE} mt-12`}
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
  'w-full rounded-2xl border border-white/10 bg-[#090909] px-4 py-3 text-white placeholder:text-white/25 focus:border-[#e0bb42] focus:outline-none focus:ring-2 focus:ring-[#e0bb42]/20';

function Field({
  label,
  children,
  dark = false
}: {
  label: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={`mb-2 block text-sm font-semibold ${
          dark ? 'text-white/85' : 'text-slate-700'
        }`}
      >
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
          ? 'bg-[#e0bb42] text-black'
          : 'border border-white/10 bg-transparent text-white/75 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}