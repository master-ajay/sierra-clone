import { NextRequest, NextResponse } from 'next/server';
import { createLine, listLines } from '@/lib/api';

export async function GET() {
  try {
    const data = await listLines();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const line = await createLine(body);
    return NextResponse.json(line, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
