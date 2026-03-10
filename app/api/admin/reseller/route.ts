import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ezai } from '@/lib/ezai/client'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, admin: null, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('rb_users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { user: null, admin: null, error: 'Forbidden' }

  return { user, admin, error: null }
}

export async function GET() {
  try {
    const { error } = await getAdminUser()
    if (error === 'Unauthorized') return NextResponse.json({ error }, { status: 401 })
    if (error === 'Forbidden') return NextResponse.json({ error }, { status: 403 })

    const stats = await ezai.getStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('Reseller stats error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await getAdminUser()
    if (error === 'Unauthorized') return NextResponse.json({ error }, { status: 401 })
    if (error === 'Forbidden') return NextResponse.json({ error }, { status: 403 })

    const body = await request.json()
    const amount = Number(body?.amount)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Số tiền không hợp lệ' }, { status: 400 })
    }

    const result = await ezai.topupReseller(amount)

    // Audit log
    const admin = createAdminClient()
    await admin.from('rb_audit_logs').insert({
      actor_id: user!.id,
      action: 'reseller_topup',
      target_type: 'reseller_account',
      target_id: null,
      metadata: { amount_usd: amount },
    }).throwOnError().then(() => {}).catch(() => {}) // non-blocking

    return NextResponse.json(result)
  } catch (err) {
    console.error('Reseller topup error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
