import { NextRequest, NextResponse } from 'next/server';
import { getChannelStats } from '@/lib/api';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const stats = await getChannelStats(params.id);
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
