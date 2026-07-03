import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAgent, updateAgent } from '@/lib/agents';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const agent = getAgent(db, params.id);
  if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = getDb();
  const agent = updateAgent(db, params.id, body);
  if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(agent);
}
