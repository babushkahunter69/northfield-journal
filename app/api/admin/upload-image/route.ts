import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { storageBucket } from '@/lib/constants';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json(
      { error: 'Unauthorized: admin cookie missing or invalid.' },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 400 });
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `uploads/${Date.now()}-${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const upload = await supabaseAdmin.storage.from(storageBucket).upload(fileName, bytes, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false
  });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(storageBucket).getPublicUrl(fileName);

  return NextResponse.json({ success: true, path: fileName, url: data.publicUrl });
}
