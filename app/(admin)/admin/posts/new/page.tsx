import { getCategories } from '@/lib/data';
import { PostEditor } from '@/components/admin/post-editor';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const categories = await getCategories();

  return <PostEditor categories={categories} initialPost={null} />;
}