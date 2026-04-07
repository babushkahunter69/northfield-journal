import { requireAdmin } from '@/lib/auth';
import { getCategories } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { EditorStudio } from '@/components/editor-studio';

export const dynamic = 'force-dynamic';

export default async function AdminEditorPage() {
  await requireAdmin();

  const [categories, postsResponse] = await Promise.all([
    getCategories(),
    supabaseAdmin
      .from('posts')
      .select('*, categories(*)')
      .order('updated_at', { ascending: false })
  ]);

  const posts = postsResponse.data ?? [];

  return (
    <div className="container-shell py-14">
      <div className="mb-8">
        <p className="eyebrow">Editorial workspace</p>
        <h1 className="display-font mt-5 text-5xl font-semibold tracking-tight text-slate-900">CMS editor</h1>
        <p className="mt-3 text-slate-600">
          Create and edit posts, upload featured images, manage SEO fields, save drafts, and publish without touching code.
        </p>
      </div>
      <EditorStudio posts={posts} categories={categories} />
    </div>
  );
}