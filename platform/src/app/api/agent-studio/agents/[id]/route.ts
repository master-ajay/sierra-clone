import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { getAgent, updateAgent } from '@/lib/agent-studio/agents';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const agent = getAgent(db, id);
  if (!agent) return NextResponse.json({ error: { code: 'not_found', message: 'agent not found', details: {} } }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const agent = updateAgent(db, id, body);
  if (!agent) return NextResponse.json({ error: { code: 'not_found', message: 'agent not found', details: {} } }, { status: 404 });
  return NextResponse.json(agent);
}
