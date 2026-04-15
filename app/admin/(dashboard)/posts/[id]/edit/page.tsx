import { notFound } from 'next/navigation';
import { PostEditor } from '@/components/admin/post-editor';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function EditPostPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !post) {
    notFound();
  }

  const { data: brief } = await supabaseAdmin
    .from('content_briefs')
    .select('working_title')
    .eq('slug', post.slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return <PostEditor post={{ ...post, primary_keyword: brief?.working_title || post.slug?.replace(/-/g, ' ') || '' }} />;
}
