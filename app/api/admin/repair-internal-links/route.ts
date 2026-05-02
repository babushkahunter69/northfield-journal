import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { repairInternalLinks } from '@/lib/content/repairInternalLinks';

async function selectPosts() {
  async function query(columns: string) {
    return supabaseAdmin
      .from('posts')
      .select(columns)
      .order('updated_at', { ascending: false })
      .limit(1000);
  }

  let response = await query('id, slug, title, excerpt, content, keywords, status, published');
  if (response.error && /published/i.test(response.error.message || '')) {
    response = await query('id, slug, title, excerpt, content, keywords, status');
  }
  if (response.error && /status/i.test(response.error.message || '')) {
    response = await query('id, slug, title, excerpt, content, keywords, published');
  }
  if (response.error && /status|published/i.test(response.error.message || '')) {
    response = await query('id, slug, title, excerpt, content, keywords');
  }

  return response;
}

async function handler() {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await selectPosts();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let repaired = 0;
  const repairedPosts: Array<{ id: string; slug: string; title: string }> = [];

  for (const post of data || []) {
    checked += 1;
    const original = String((post as any).content || '');
    const cleaned = await repairInternalLinks(original, {
      excludeSlug: (post as any).slug,
      title: (post as any).title,
      excerpt: (post as any).excerpt || '',
      keywords: Array.isArray((post as any).keywords) ? (post as any).keywords : []
    });

    if (cleaned === original) continue;

    const update = await supabaseAdmin
      .from('posts')
      .update({ content: cleaned, updated_at: new Date().toISOString() })
      .eq('id', (post as any).id);

    if (!update.error) {
      repaired += 1;
      repairedPosts.push({
        id: String((post as any).id),
        slug: String((post as any).slug || ''),
        title: String((post as any).title || '')
      });
    }
  }

  return NextResponse.json({ success: true, checked, repaired, repairedPosts });
}

export async function POST() {
  return handler();
}

export async function GET() {
  return handler();
}
