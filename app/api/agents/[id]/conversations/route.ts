import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createConversation, listConversationsForAgent } from '@/lib/conversations';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  return NextResponse.json(listConversationsForAgent(db, params.id));
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const conversation = createConversation(db, params.id);
  return NextResponse.json(conversation, { status: 201 });
}
