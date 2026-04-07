import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(user && adminEmail && user.email?.toLowerCase() === adminEmail);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail) {
    redirect('/admin/login');
  }

  return user;
}