import { createClient } from '@/lib/supabase/server'

export type AppRole = 'admin' | 'editor' | 'contributor'

export type Profile = {
  id: string
  email: string | null
  name: string | null
  slug: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  twitter: string | null
  linkedin: string | null
  role: AppRole
}

export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    user,
    profile: profile as Profile | null,
  }
}

export async function requireUser() {
  const result = await getCurrentUser()
  if (!result?.user) {
    throw new Error('Unauthorized')
  }
  return result
}

export async function requireEditor() {
  const result = await requireUser()
  const role = result.profile?.role

  if (role !== 'editor' && role !== 'admin') {
    throw new Error('Forbidden')
  }

  return result
}