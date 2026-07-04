import { NextRequest, NextResponse } from 'next/server';
import { submitResolution } from '@/lib/api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const result = await submitResolution(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
