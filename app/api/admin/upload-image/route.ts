import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isAdmin } from '@/lib/auth';
import { storageBucket } from '@/lib/constants';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const allowed = await isAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `featured/${randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(storageBucket)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(storageBucket).getPublicUrl(filePath);
  return NextResponse.json({ url: data.publicUrl });
}