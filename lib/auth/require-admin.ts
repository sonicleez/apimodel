import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

interface AdminContext {
  user: User
  admin: ReturnType<typeof createAdminClient>
}

type AdminResult =
  | ({ ok: true } & AdminContext)
  | { ok: false; status: 401 | 403 }

/**
 * Validates that the current request is authenticated as an admin.
 * Returns the authenticated user + admin Supabase client on success.
 */
export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401 }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('rb_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { ok: false, status: 403 }

  return { ok: true, user, admin }
}
