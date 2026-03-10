import { NextResponse } from 'next/server'

type ErrorStatus = 401 | 403 | 400 | 404 | 500

export function apiError(message: string, status: ErrorStatus) {
  return NextResponse.json({ error: message }, { status })
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Server error'
  return NextResponse.json({ error: message }, { status: 500 })
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
