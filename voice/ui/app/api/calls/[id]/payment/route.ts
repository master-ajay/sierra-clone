import { NextRequest, NextResponse } from 'next/server';
import { collectPayment } from '@/lib/api';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const result = await collectPayment(params.id, body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
