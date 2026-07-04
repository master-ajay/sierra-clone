import { NextRequest, NextResponse } from 'next/server';
import { escalateCall } from '@/lib/api';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await escalateCall(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
