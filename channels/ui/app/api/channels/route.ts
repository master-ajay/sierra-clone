import { NextRequest, NextResponse } from 'next/server';
import { createChannel, listChannels } from '@/lib/api';

export async function GET() {
  try {
    const data = await listChannels();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const channel = await createChannel(body);
    return NextResponse.json(channel, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
