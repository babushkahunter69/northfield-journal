import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json(
      { error: 'Unauthorized: admin cookie missing or invalid.' },
      { status: 401 }
    );
  }

  // keep the rest of your current upload logic unchanged
}