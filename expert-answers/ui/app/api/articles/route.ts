import { NextRequest, NextResponse } from 'next/server';
import { listArticles } from '@/lib/api';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const topic = req.nextUrl.searchParams.get('topic') ?? undefined;
  try {
    const data = await listArticles({ status, topic });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}
