import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateCoverPrompt } from '@/lib/ai/generate-cover-prompt';

async function uploadImageToSupabase(imageUrl: string, slug: string) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download generated image.');
  }

  const contentType = imageResponse.headers.get('content-type') || 'image/png';
  const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = `covers/${slug}-${Date.now()}.${extension}`;
  const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'post-media';

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      upsert: false
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload image to storage.');
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    const title = String(body?.title || '').trim();
    const excerpt = String(body?.excerpt || '').trim();
    const slug =
      String(body?.slug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `cover-${Date.now()}`;
    const category = String(body?.category || 'education').trim();

    if (!title) {
      return NextResponse.json({ error: 'title is required.' }, { status: 400 });
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing AI_API_KEY.' }, { status: 500 });
    }

    const prompt = generateCoverPrompt({ title, excerpt, category });

    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1024'
      })
    });

    const imageData = await imageResponse.json().catch(() => null);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: imageData?.error?.message || 'Image generation failed.' },
        { status: 500 }
      );
    }

    const b64 = imageData?.data?.[0]?.b64_json;
    const remoteUrl = imageData?.data?.[0]?.url;

    let publicUrl: string;

    if (remoteUrl) {
      publicUrl = await uploadImageToSupabase(remoteUrl, slug);
    } else if (b64) {
      const buffer = Buffer.from(b64, 'base64');
      const filePath = `covers/${slug}-${Date.now()}.png`;
      const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'post-media';

      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        throw new Error(error.message || 'Failed to upload generated image.');
      }

      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
      publicUrl = data.publicUrl;
    } else {
      throw new Error('No generated image was returned.');
    }

    return NextResponse.json({
      success: true,
      url: publicUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown cover generation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}