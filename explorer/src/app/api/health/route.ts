import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'

export function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied
  try {
    const db = getDb()
    db.prepare('SELECT 1').get()
    return NextResponse.json({ status: 'ok', database: 'connected' })
  } catch {
    return NextResponse.json({ status: 'ok', database: 'error' })
  }
}
