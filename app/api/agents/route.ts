import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createAgent, listAgents } from '@/lib/agents';

export async function GET() {
  const db = getDb();
  return NextResponse.json(listAgents(db));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'name is required', details: {} } }, { status: 400 });
  }
  const db = getDb();
  const agent = createAgent(db, body);
  return NextResponse.json(agent, { status: 201 });
}
