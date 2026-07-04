import { NextRequest, NextResponse } from 'next/server';
import { getChannelSnippet } from '@/lib/api';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const snippet = await getChannelSnippet(params.id);
    return NextResponse.json(snippet);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
