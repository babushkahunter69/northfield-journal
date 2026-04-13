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

  return <PostEditor post={post} />;
}