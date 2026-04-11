import { cookies } from 'next/headers';

export async function isCookieAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('nj-admin-token')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  return Boolean(token && adminPassword && token === adminPassword);
}