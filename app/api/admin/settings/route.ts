import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { apiError, serverError } from '@/lib/api/response'

// GET /api/admin/settings
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const { data } = await auth.admin.from('rb_settings').select('*')
    const settings = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
    return NextResponse.json(settings)
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/admin/settings — upsert key/value pairs
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const body = await request.json()
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await auth.admin
      .from('rb_settings')
      .upsert(updates, { onConflict: 'key' })

    if (error) throw error

    await auth.admin.from('rb_audit_logs').insert({
      actor_id: auth.user.id,
      action: 'settings_updated',
      target_type: 'rb_settings',
      target_id: null,
      metadata: body,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin settings error:', err)
    return serverError(err)
  }
}
