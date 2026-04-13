import { PostEditor } from '@/components/admin/post-editor';

export default async function NewPostPage() {
  return (
    <PostEditor
      post={{
        title: '',
        excerpt: '',
        content: '',
        status: 'draft'
      }}
    />
  );
}