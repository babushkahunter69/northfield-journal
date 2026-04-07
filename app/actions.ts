'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { estimateReadingTime, excerptFromContent, makeSlug } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth';

export async function signInWithMagicLink(
  _: { error?: string; success?: string },
  formData: FormData
) {
  const email = String(formData.get('email') || '').trim().toLowerCase();

  if (email !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return { error: 'Only the configured admin email can sign in.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/admin/editor`
    }
  });

  if (error) return { error: error.message };
  return { success: 'Check your email for the secure sign-in link.' };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function approveSubmission(formData: FormData): Promise<void> {
  await requireAdmin();

  const submissionId = String(formData.get('submissionId'));
  const categoryId = String(formData.get('categoryId')) || null;
  const featured = String(formData.get('featured')) === 'on';

  const { data: submission, error: fetchError } = await supabaseAdmin
    .from('guest_post_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    throw new Error('Submission not found.');
  }

  const slugBase = makeSlug(submission.proposed_title);
  const slug = `${slugBase}-${submission.id.slice(0, 6)}`;

  const postPayload = {
    title: submission.proposed_title,
    slug,
    excerpt: excerptFromContent(submission.article_content),
    content: submission.article_content,
    author_name: submission.full_name,
    author_bio: submission.bio,
    category_id: categoryId || null,
    meta_title: submission.proposed_title,
    meta_description: excerptFromContent(submission.article_content, 150),
    keywords: submission.target_keyword ? [submission.target_keyword] : [],
    is_featured: featured,
    status: 'published',
    reading_time_minutes: estimateReadingTime(submission.article_content),
    published_at: new Date().toISOString()
  };

  const { error: insertError } = await supabaseAdmin.from('posts').insert(postPayload);
  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await supabaseAdmin
    .from('guest_post_submissions')
    .update({ status: 'accepted' })
    .eq('id', submissionId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/admin/submissions');
  revalidatePath('/admin/editor');
}

export async function rejectSubmission(formData: FormData): Promise<void> {
  await requireAdmin();

  const submissionId = String(formData.get('submissionId'));
  const { error } = await supabaseAdmin
    .from('guest_post_submissions')
    .update({ status: 'rejected' })
    .eq('id', submissionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/submissions');
}