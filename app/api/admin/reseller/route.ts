import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { apiError, serverError } from '@/lib/api/response'
import { ezai } from '@/lib/ezai/client'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const stats = await ezai.getStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('Reseller stats error:', err)
    return serverError(err)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const body = await request.json()
    const amount = Number(body?.amount)
    if (!amount || amount <= 0) return apiError('Số tiền không hợp lệ', 400)

    const result = await ezai.topupReseller(amount)

    // Fire-and-forget audit log
    auth.admin.from('rb_audit_logs').insert({
      actor_id: auth.user.id,
      action: 'reseller_topup',
      target_type: 'reseller_account',
      target_id: null,
      metadata: { amount_usd: amount },
    }).then(() => {}).catch(() => {})

    return NextResponse.json(result)
  } catch (err) {
    console.error('Reseller topup error:', err)
    return serverError(err)
  }
}
