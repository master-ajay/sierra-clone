import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/agent-studio/db';
import { createConversation, listConversationsForAgent } from '@/lib/agent-studio/conversations';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  return NextResponse.json(listConversationsForAgent(db, id));
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const conversation = createConversation(db, id);
  return NextResponse.json(conversation, { status: 201 });
}
