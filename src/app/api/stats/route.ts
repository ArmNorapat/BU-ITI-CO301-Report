import { NextResponse } from 'next/server';

import { SheetError, getStats } from '@/lib/sheet';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(
      { ok: true, stats },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    const code = err instanceof SheetError ? err.code : 'SERVER_ERROR';
    if (!(err instanceof SheetError)) console.error('[api/stats]', err);
    return NextResponse.json({ ok: false, error: code }, { status: 502 });
  }
}
