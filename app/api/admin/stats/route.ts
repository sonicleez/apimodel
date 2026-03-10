import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { apiError, serverError } from '@/lib/api/response'
import { ezai } from '@/lib/ezai/client'
import { AdminUserStat, EzaiUser } from '@/types'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const [rbResult, ezaiResult, authResult] = await Promise.allSettled([
      auth.admin
        .from('rb_users')
        .select('id, name, ezai_user_id')
        .not('ezai_user_id', 'is', null)
        .order('created_at', { ascending: false }),
      ezai.listUsers(1, 100),
      auth.admin.auth.admin.listUsers({ perPage: 1000 }),
    ])

    const rbUsers = rbResult.status === 'fulfilled' ? (rbResult.value.data ?? []) : []
    const ezaiUsers = ezaiResult.status === 'fulfilled' ? ezaiResult.value.users : []
    const authUsers = authResult.status === 'fulfilled' ? (authResult.value.data?.users ?? []) : []

    const emailMap = Object.fromEntries(
      authUsers.filter(u => u.id && u.email).map(u => [u.id, u.email!])
    )

    const ezaiMap = Object.fromEntries(
      ezaiUsers.map((u): [string, EzaiUser] => [u.id, u])
    )

    const stats: AdminUserStat[] = rbUsers
      .map((rb) => {
        const ezai = rb.ezai_user_id ? ezaiMap[rb.ezai_user_id] : null
        return {
          rb_user_id: rb.id,
          name: rb.name,
          email: emailMap[rb.id] ?? '',
          ezai_user_id: rb.ezai_user_id,
          balance: ezai?.balance ?? 0,
          plan_type: ezai?.plan_type ?? 'none',
          daily_limit: ezai?.daily_limit ?? 0,
          daily_used: ezai?.daily_used ?? 0,
          plan_expires_at: ezai?.plan_expires_at ?? null,
        }
      })
      .sort((a, b) => b.daily_used - a.daily_used)

    return NextResponse.json({ stats, total: stats.length })
  } catch (err) {
    console.error('Admin stats error:', err)
    return serverError(err)
  }
}
