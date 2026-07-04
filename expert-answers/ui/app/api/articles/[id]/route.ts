import { NextRequest, NextResponse } from 'next/server';
import { getArticle, updateArticle } from '@/lib/api';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const article = await getArticle(params.id);
    return NextResponse.json(article);
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const article = await updateArticle(params.id, body);
    return NextResponse.json(article);
  } catch (err) {
    const message = (err as Error).message;
    const status = message.toLowerCase().includes('transition') ? 400 : 502;
    return NextResponse.json({ error: { message } }, { status });
  }
}
