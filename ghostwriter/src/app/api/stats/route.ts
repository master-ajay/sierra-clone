import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'

export function GET(req: NextRequest) {
  const denied = checkApiKey(req)
  if (denied) return denied
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as n FROM articles').get() as { n: number }).n
  const indexed = (db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='indexed'").get() as { n: number }).n
  const pending = (db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='pending'").get() as { n: number }).n
  const error = (db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='error'").get() as { n: number }).n
  return NextResponse.json({ total, by_status: { indexed, pending, error } })
}
