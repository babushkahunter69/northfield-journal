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
  'journal-prose prose prose-lg max-w-none prose-headings:tracking-tight prose-headings:text-slate-900 prose-h1:mt-0 prose-h1:mb-4 prose-h1:text-4xl prose-h1:font-semibold prose-h1:leading-tight prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-3xl prose-h2:font-semibold prose-h2:leading-tight prose-h3:mt-7 prose-h3:mb-2 prose-h3:text-2xl prose-h3:font-semibold prose-p:my-4 prose-p:leading-8 prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-a:text-brand-700 prose-a:underline prose-strong:text-slate-900';

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

    if (unwrapTags.has(tag)) {
      return children;
    }

    if (!allowedTags.has(tag)) {
      return children;
    }

    if (tag === 'a') {
      const rawHref = el.getAttribute('href')?.trim() || '';
      const safeHref =
        rawHref.startsWith('http://') ||
        rawHref.startsWith('https://') ||
        rawHref.startsWith('/') ||
        rawHref.startsWith('#')
          ? rawHref
          : '';

      if (!safeHref) {
        return children;
      }

      return `<a href="${escapeHtml(safeHref)}" rel="noopener noreferrer">${children}</a>`;
    }

    if (tag === 'strong' || tag === 'b') {
      return `<strong>${children}</strong>`;
    }

    if (tag === 'em' || tag === 'i') {
      return `<em>${children}</em>`;
    }

    if (tag === 'br') {
      return '<br>';
    }

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
  const [mode, setMode] = useState<EditorMode>('html');

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
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
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

  function loadPost(id: string) {
    setSelectedId(id);

    if (id === 'new') {
      setForm(blankPost);
      setMessage('');
      setMode('html');
      return;
    }

    const post = posts.find((item) => item.id === id);
    if (!post) return;

    setForm({
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
      status: post.status
    });

    setMessage('');
  }

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

  async function savePost() {
    setSaving(true);
    setMessage('');

    const finalContent =
      mode === 'visual' && editor
        ? stripNofollowFromHtml(editor.getHTML())
        : stripNofollowFromHtml(form.content);

    const payload = {
      ...form,
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

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.error || 'Unable to save.');
      return;
    }

    setForm((prev) => ({ ...prev, content: payload.content }));
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

  return (
    <div className="space-y-8">
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
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
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

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={autoGenerateSeo}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
                  >
                    Auto-fill SEO
                  </button>
                </div>
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
                      onChange={(e) => updateField('featured_image_url', e.target.value)}
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

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={switchToHtmlMode}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      mode === 'html'
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-300 text-slate-700'
                    }`}
                  >
                    HTML editor
                  </button>
                  <button
                    type="button"
                    onClick={switchToVisualMode}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      mode === 'visual'
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-300 text-slate-700'
                    }`}
                  >
                    Visual editor
                  </button>
                </div>

                {mode === 'html' ? (
                  <Field label="Body HTML">
                    <textarea
                      rows={20}
                      value={form.content}
                      onChange={(e) =>
                        updateField('content', stripNofollowFromHtml(e.target.value))
                      }
                      placeholder="<h1>Title</h1><h2>Section</h2><p>Paragraph...</p>"
                      className="w-full rounded-[20px] border border-slate-300 bg-white px-4 py-4 font-mono text-sm leading-7 text-slate-800"
                    />
                  </Field>
                ) : (
                  <Field label="Body">
                    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-stone-50 px-4 py-3">
                        <ToolbarButton
                          active={!!editor?.isActive('bold')}
                          onClick={() => editor?.chain().focus().toggleBold().run()}
                        >
                          Bold
                        </ToolbarButton>

                        <ToolbarButton
                          active={!!editor?.isActive('italic')}
                          onClick={() => editor?.chain().focus().toggleItalic().run()}
                        >
                          Italic
                        </ToolbarButton>

                        <ToolbarButton
                          active={!!editor?.isActive('heading', { level: 2 })}
                          onClick={() =>
                            editor?.chain().focus().toggleHeading({ level: 2 }).run()
                          }
                        >
                          H2
                        </ToolbarButton>

                        <ToolbarButton
                          active={!!editor?.isActive('heading', { level: 3 })}
                          onClick={() =>
                            editor?.chain().focus().toggleHeading({ level: 3 }).run()
                          }
                        >
                          H3
                        </ToolbarButton>

                        <ToolbarButton
                          active={!!editor?.isActive('bulletList')}
                          onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        >
                          List
                        </ToolbarButton>

                        <ToolbarButton
                          active={!!editor?.isActive('blockquote')}
                          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
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

                      <div className="min-h-[420px] px-6 py-5">
                        <EditorContent editor={editor} />
                      </div>
                    </div>
                  </Field>
                )}
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
                      onChange={(e) => updateField('meta_description', e.target.value)}
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

                  <div className="grid gap-4">
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
                          updateField('status', e.target.value as 'draft' | 'published')
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

                  {message ? <p className="text-sm text-slate-600">{message}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="paper overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Full article preview
          </p>
          <h2 className="display-font mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
            CMS preview styled like a real article
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Use this section to judge hierarchy, spacing, and rhythm. It is much closer
            to the actual reading experience than the old compact sidebar card.
          </p>
        </div>

        <div className="px-6 py-8 sm:px-8 lg:px-12">
          <article className="article-page">
            <div className="mx-auto max-w-4xl">
              <div className="article-meta-row mb-6 flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                <span className="text-brand-700">
                  {categories.find((category) => category.id === form.category_id)?.name ||
                    'Journal'}
                </span>
                <span>{form.status}</span>
                <span>{form.author_name || 'Editorial Team'}</span>
              </div>

              <h1 className="display-font article-title text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {form.title || 'Untitled article'}
              </h1>

              <p className="article-dek mt-5 max-w-3xl text-xl leading-9 text-slate-600">
                {form.excerpt || 'Your excerpt will appear here.'}
              </p>

              {form.featured_image_url ? (
                <div className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-stone-50">
                  <div className="relative aspect-[16/8]">
                    <Image
                      src={form.featured_image_url}
                      alt={form.title || 'Featured image preview'}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : null}

              <div
                className={`${ARTICLE_PROSE} mt-12`}
                dangerouslySetInnerHTML={{
                  __html: stripNofollowFromHtml(form.content)
                }}
              />
            </div>
          </article>
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
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? 'bg-slate-900 text-white'
          : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}