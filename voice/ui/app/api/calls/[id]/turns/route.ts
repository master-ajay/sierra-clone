import { NextRequest, NextResponse } from 'next/server';
import { exchangeTurn, getLine } from '@/lib/api';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { lineId, text } = await req.json();
  try {
    const line = await getLine(lineId);
    const result = await exchangeTurn(params.id, line.line_key, text);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
