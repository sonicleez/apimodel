import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { apiError, serverError } from '@/lib/api/response'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const { topup_id, admin_note } = await request.json()
    if (!topup_id) return apiError('topup_id required', 400)

    const { data: topup } = await auth.admin
      .from('rb_topup_requests')
      .select('status')
      .eq('id', topup_id)
      .single()

    if (!topup) return apiError('Not found', 404)
    if (topup.status !== 'pending') return apiError(`Cannot reject a ${topup.status} request`, 400)

    const { data: updated, error } = await auth.admin
      .from('rb_topup_requests')
      .update({
        status: 'rejected',
        admin_note: admin_note || null,
        approved_by: auth.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', topup_id)
      .select()
      .single()

    if (error) throw error

    await auth.admin.from('rb_audit_logs').insert({
      actor_id: auth.user.id,
      action: 'topup_rejected',
      target_type: 'topup_request',
      target_id: topup_id,
      metadata: { admin_note },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Topup reject error:', err)
    return serverError(err)
  }
}
