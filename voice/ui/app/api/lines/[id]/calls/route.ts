import { NextRequest, NextResponse } from 'next/server';
import { getLine, startCall } from '@/lib/api';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const line = await getLine(params.id);
    const call = await startCall(params.id, line.line_key);
    return NextResponse.json(call, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
