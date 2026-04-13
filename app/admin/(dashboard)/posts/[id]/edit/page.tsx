import { notFound } from 'next/navigation';
import { PostEditor } from '@/components/admin/post-editor';
import { getPostById } from '@/lib/data';

export default async function EditPostPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return <PostEditor post={post} />;
}