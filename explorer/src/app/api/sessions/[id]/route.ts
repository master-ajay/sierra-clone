import { NextRequest, NextResponse } from 'next/server'
import { checkApiKey, apiError } from '../../../../../lib/auth'
import { fetchSession, fetchSessionMessages } from '../../../../../lib/adp'
import { buildTrace } from '../../../../../lib/sessions'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = checkApiKey(req)
  if (denied) return denied

  const sessionId = params.id
  const session = await fetchSession(sessionId)
  if (!session) {
    return apiError('not_found', 'Session not found', 404)
  }

  const messages = await fetchSessionMessages(sessionId)
  const trace = buildTrace(messages)

  return NextResponse.json({ session, messages: trace })
}
