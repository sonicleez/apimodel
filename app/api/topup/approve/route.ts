import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { apiError, serverError } from '@/lib/api/response'
import { ezai } from '@/lib/ezai/client'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const { topup_id, admin_note } = await request.json()
    if (!topup_id) return apiError('topup_id required', 400)

    const { data: topup, error: fetchErr } = await auth.admin
      .from('rb_topup_requests')
      .select('*')
      .eq('id', topup_id)
      .single()

    if (fetchErr || !topup) return apiError('Topup request not found', 404)
    if (topup.status !== 'pending') return apiError(`Cannot approve a ${topup.status} request`, 400)

    const { data: userProfile } = await auth.admin
      .from('rb_users')
      .select('ezai_user_id')
      .eq('id', topup.user_id)
      .single()

    if (!userProfile?.ezai_user_id) return apiError('User does not have an EzAI account', 400)

    // Call EzAI depending on request type
    if (topup.type === 'plan' && topup.plan_name) {
      await ezai.activatePlan(userProfile.ezai_user_id, topup.plan_name as 'starter' | 'pro' | 'max' | 'ultra')
    } else {
      await ezai.topupUser(userProfile.ezai_user_id, topup.usd_amount)
    }

    const { data: updated, error: updateErr } = await auth.admin
      .from('rb_topup_requests')
      .update({
        status: 'approved',
        admin_note: admin_note || null,
        approved_by: auth.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', topup_id)
      .select()
      .single()

    if (updateErr) throw updateErr

    await auth.admin.from('rb_audit_logs').insert({
      actor_id: auth.user.id,
      action: 'topup_approved',
      target_type: 'topup_request',
      target_id: topup_id,
      metadata: {
        user_id: topup.user_id,
        vnd_amount: topup.vnd_amount,
        usd_amount: topup.usd_amount,
        credit_amount: topup.credit_amount,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Topup approve error:', err)
    return serverError(err)
  }
}
