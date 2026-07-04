import { NextResponse } from 'next/server';
import { listAgents } from '@/lib/api';

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json(agents);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
