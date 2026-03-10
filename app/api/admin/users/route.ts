import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { apiError, serverError } from '@/lib/api/response'
import { ezai } from '@/lib/ezai/client'

// GET /api/admin/users — list all users
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const { data: users } = await auth.admin
      .from('rb_users')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json(users ?? [])
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/admin/users — provision EzAI account for a user
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

  try {
    const { user_id } = await request.json()
    if (!user_id) return apiError('user_id required', 400)

    const { data: target } = await auth.admin
      .from('rb_users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (!target) return apiError('User not found', 404)
    if (target.ezai_user_id) return apiError('User already has an EzAI account', 400)

    const { data: { user: authUser } } = await auth.admin.auth.admin.getUserById(user_id)
    if (!authUser?.email) return apiError('User email not found', 404)

    const ezaiUser = await ezai.createUser(authUser.email, target.name || authUser.email)

    const { data: updated } = await auth.admin
      .from('rb_users')
      .update({ ezai_user_id: ezaiUser.id, ezai_api_key: ezaiUser.api_key })
      .eq('id', user_id)
      .select()
      .single()

    await auth.admin.from('rb_audit_logs').insert({
      actor_id: auth.user.id,
      action: 'user_provisioned',
      target_type: 'rb_user',
      target_id: user_id,
      metadata: { ezai_user_id: ezaiUser.id },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Admin create user error:', err)
    return serverError(err)
  }
}
