'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { PostPreview } from '@/components/admin/post-preview';
import { SeoChecklist } from '@/components/admin/seo-checklist';
import { showAdminToast } from '@/lib/admin/toast';

type Post = {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
  meta_title?: string;
  meta_description?: string;
  featured_image_url?: string | null;
  slug?: string;
  is_featured_homepage?: boolean;
  primary_keyword?: string | null;
};

export function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<Post>({
    ...post,
    meta_title: post.meta_title || post.title || '',
    meta_description: post.meta_description || post.excerpt || '',
    featured_image_url: post.featured_image_url || ''
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [settingFeatured, setSettingFeatured] = useState(false);
  const [improving, setImproving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const inputClass =
    'w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base leading-6 text-slate-900 placeholder:text-stone-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12';


  function applyPostData(nextPost: Partial<Post> | null | undefined) {
    if (!nextPost) return;

    setForm((prev) => {
      const merged = {
        ...prev,
        ...nextPost,
        featured_image_url:
          nextPost.featured_image_url !== undefined
            ? nextPost.featured_image_url || ''
            : prev.featured_image_url || ''
      };

      return merged;
    });

    if (nextPost.content !== undefined) {
      editor?.commands.setContent(nextPost.content || '', { emitUpdate: false });
    }
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content: form.content || '',
    immediatelyRender: false,
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
      const response = await fetch('/api/admin/save-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Save failed', description: data?.error || 'Failed to save draft.' });
        return;
      }

      if (data?.post) {
        applyPostData(data.post);
      }

      showAdminToast({ type: 'success', title: 'Draft saved', description: 'Your article changes have been saved.' });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function publishPost() {
    if (!form.id) {
      showAdminToast({ type: 'info', title: 'Save required', description: 'Save the draft first before publishing.' });
      return;
    }

    setPublishing(true);

    try {
      const saveResponse = await fetch('/api/admin/save-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const saveData = await saveResponse.json().catch(() => null);

      if (!saveResponse.ok) {
        showAdminToast({ type: 'error', title: 'Publish failed', description: saveData?.error || 'Failed to save before publishing.' });
        return;
      }

      const response = await fetch('/api/admin/publish-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: form.id })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Publish failed', description: data?.error || 'Failed to publish.' });
        return;
      }

      setForm((prev) => ({ ...prev, status: 'published' }));
      showAdminToast({ type: 'success', title: 'Article published', description: 'The article is now live.' });
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishPost() {
    if (!form.id) {
      showAdminToast({ type: 'info', title: 'Save required', description: 'Save the post first.' });
      return;
    }

    const confirmed = window.confirm(
      'Move this published article back to draft?'
    );
    if (!confirmed) return;

    setPublishing(true);

    try {
      const response = await fetch('/api/admin/unpublish-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: form.id })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Move to draft failed', description: data?.error || 'Failed to move article back to draft.' });
        return;
      }

      setForm((prev) => ({ ...prev, status: 'draft' }));
      showAdminToast({ type: 'success', title: 'Article moved to draft', description: 'The article is no longer live.' });
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function setFeaturedArticle() {
    if (!form.id) {
      showAdminToast({ type: 'info', title: 'Save required', description: 'Save the post first.' });
      return;
    }

    setSettingFeatured(true);

    try {
      const response = await fetch('/api/admin/set-featured-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: form.id })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Featured article failed', description: data?.error || 'Failed to set featured article.' });
        return;
      }

      setForm((prev) => ({ ...prev, is_featured_homepage: true }));
      showAdminToast({ type: 'success', title: 'Homepage feature updated', description: 'This article is now marked as the homepage feature.' });
      router.refresh();
    } finally {
      setSettingFeatured(false);
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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showAdminToast({ type: 'error', title: 'Regeneration failed', description: data?.error || 'Failed to regenerate.' });
        return;
      }

      if (data?.post) {
        applyPostData(data.post);
      }

      showAdminToast({
        type: 'success',
        title: 'Article regenerated',
        description:
          typeof data?.after === 'number'
            ? `The draft was refreshed. Updated score: ${data.after}.`
            : 'The draft content has been refreshed.'
      });
      router.refresh();
    } finally {
      setRegenerating(false);
    }
  }

  async function uploadCoverImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    setUploadingImage(true);

    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Image upload failed', description: data?.error || 'Image upload failed.' });
        return;
      }

      const imageUrl = data?.url || data?.publicUrl || data?.imageUrl;
      if (!imageUrl) {
        showAdminToast({ type: 'error', title: 'Image upload incomplete', description: 'Upload succeeded but no image URL was returned.' });
        return;
      }

      setForm((prev) => ({
        ...prev,
        featured_image_url: imageUrl
      }));
      showAdminToast({ type: 'success', title: 'Cover image uploaded', description: 'The featured image has been updated.' });
    } finally {
      setUploadingImage(false);
    }
  }

  async function generateStockCover() {
    if (!form.title.trim()) {
      showAdminToast({ type: 'info', title: 'Title required', description: 'Add a title first before generating a cover.' });
      return;
    }

    setGeneratingCover(true);

    try {
      const response = await fetch('/api/admin/generate-cover-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          slug: form.slug || form.title,
          category: 'education'
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAdminToast({ type: 'error', title: 'Cover generation failed', description: data?.error || 'Stock cover lookup failed.' });
        return;
      }

      if (!data?.url) {
        showAdminToast({ type: 'error', title: 'Cover generation incomplete', description: 'Cover was generated but no URL was returned.' });
        return;
      }

      setForm((prev) => ({
        ...prev,
        featured_image_url: data.url
      }));
      showAdminToast({ type: 'success', title: 'Cover image updated', description: 'A new cover image was added to the article.' });
    } finally {
      setGeneratingCover(false);
    }
  }


  async function improveFailedChecks() {
    if (!form.id) return;

    setImproving(true);

    try {
      const res = await fetch('/api/admin/improve-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: form.id })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showAdminToast({ type: 'error', title: 'Improve failed', description: data?.error || 'Failed to improve article.' });
        return;
      }

      if (data?.post) {
        applyPostData(data.post);
      }

      showAdminToast({
        type: 'success',
        title: 'Article improved',
        description:
          typeof data?.after === 'number'
            ? `The article was improved. Updated score: ${data.after}.`
            : 'The article was improved successfully.'
      });
      router.refresh();
    } finally {
      setImproving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadCoverImage(file);
    event.target.value = '';
  }

  const derivedMetaTitle = useMemo(() => {
    return form.meta_title?.trim() || form.title || '';
  }, [form.meta_title, form.title]);

  const derivedMetaDescription = useMemo(() => {
    return form.meta_description?.trim() || form.excerpt || '';
  }, [form.meta_description, form.excerpt]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'edit'
                ? 'bg-[#0f172a] text-white'
                : 'border border-[#d9cfbf] bg-white text-slate-700'
            }`}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'preview'
                ? 'bg-[#0f172a] text-white'
                : 'border border-[#d9cfbf] bg-white text-slate-700'
            }`}
          >
            Full Preview
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={regenerateArticle}
            disabled={!form.id || regenerating}
            className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-[#fffdfa] disabled:opacity-60"
          >
            {regenerating ? 'Regenerating...' : 'Regenerate Article'}
          </button>

          <button
            onClick={improveFailedChecks}
            disabled={!form.id || improving}
            className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-[#fffdfa] disabled:opacity-60"
          >
            {improving ? 'Improving...' : 'Improve Failed Checks'}
          </button>

          <button
            onClick={saveDraft}
            disabled={saving}
            className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-[#fffdfa] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={setFeaturedArticle}
            disabled={!form.id || settingFeatured}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${
              form.is_featured_homepage
                ? 'border border-amber-300 bg-amber-100 text-amber-800'
                : 'border border-[#d9cfbf] bg-white text-slate-700 hover:bg-[#fffdfa]'
            } disabled:opacity-60`}
          >
            {settingFeatured
              ? 'Setting featured...'
              : form.is_featured_homepage
              ? 'Featured on homepage'
              : 'Set as featured'}
          </button>

          {form.status === 'published' ? (
            <button
              onClick={unpublishPost}
              disabled={publishing}
              className="rounded-2xl border border-[#d9cfbf] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-[#fffdfa] disabled:opacity-60"
            >
              {publishing ? 'Updating...' : 'Move to Draft'}
            </button>
          ) : (
            <button
              onClick={publishPost}
              disabled={publishing}
              className="rounded-2xl bg-[#0f172a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:bg-black disabled:opacity-60"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Post title..."
          />

          <textarea
            className="w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base leading-7 text-slate-900 placeholder:text-stone-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12"
            rows={3}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="Short summary..."
          />

          <div className="rounded-[24px] border border-[#e2d9cb] bg-[#fffdf8] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6730]">
                  Cover image
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Upload one manually or generate a photorealistic AI cover.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="rounded-2xl border border-[#d9cfbf] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#fffdfa] disabled:opacity-60"
                >
                  {uploadingImage ? 'Uploading...' : 'Upload image'}
                </button>

                <button
                  type="button"
                  onClick={generateStockCover}
                  disabled={generatingCover}
                  className="rounded-2xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {generatingCover ? 'Finding cover...' : 'Find stock cover'}
                </button>
              </div>
            </div>

            <input
              className={`${inputClass} mt-4`}
              value={form.featured_image_url || ''}
              onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })}
              placeholder="https://..."
            />

            {form.featured_image_url ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#e2d9cb] bg-white">
                <div className="relative aspect-[16/9] w-full">
                  <Image
                    src={form.featured_image_url}
                    alt="Featured image preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </div>

          <input
            className={inputClass}
            value={form.meta_title || ''}
            onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
            placeholder="Meta title..."
          />

          <textarea
            className="w-full rounded-2xl border border-[#d6cebf] bg-white px-4 py-3 text-base leading-7 text-slate-900 placeholder:text-stone-400 focus:border-[#a16207] focus:outline-none focus:ring-2 focus:ring-[#a16207]/12"
            rows={3}
            value={form.meta_description || ''}
            onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
            placeholder="Meta description..."
          />

          {activeTab === 'edit' ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="overflow-hidden rounded-[24px] border border-[#e2d9cb] bg-[#fffdf9] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="border-b border-[#e2d9cb] bg-[#f8f3ea] px-4 py-3 text-sm text-slate-600">
                  Rich Text Editor
                </div>

                <div className="bg-white px-8 py-8 text-slate-900">
                  <div className="mx-auto max-w-3xl">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>

              <PostPreview
                title={form.title}
                excerpt={form.excerpt}
                content={form.content}
              />
            </div>
          ) : (
            <PostPreview
              title={form.title}
              excerpt={form.excerpt}
              content={form.content}
            />
          )}
        </div>

        <div className="space-y-6">
          <SeoChecklist
            title={form.title}
            excerpt={form.excerpt}
            content={form.content}
            metaTitle={derivedMetaTitle}
            metaDescription={derivedMetaDescription}
            featuredImageUrl={form.featured_image_url || null}
            primaryKeyword={form.primary_keyword || form.slug || form.title}
          />
        </div>
      </div>
    </div>
  );
}