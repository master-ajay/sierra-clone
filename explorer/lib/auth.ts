import { NextRequest, NextResponse } from 'next/server'

export function apiError(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
  return NextResponse.json({ error: { code, message, details } }, { status })
}

export function checkApiKey(req: NextRequest): NextResponse | null {
  const key = req.headers.get('X-API-Key') ?? ''
  const expected = process.env.EXPLORER_API_KEY ?? 'change-me'
  if (key !== expected) {
    return apiError('unauthorized', 'Invalid or missing API key', 401)
  }
  return null
}
