import { NextResponse } from 'next/server';

import { clientKey, rateLimit } from '@/lib/rate-limit';
import { SheetError, getStudent } from '@/lib/sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  INVALID_ID: 'รหัสนักศึกษาไม่ถูกต้อง กรุณากรอกเป็นตัวเลข 10 หลัก',
  NOT_FOUND: 'ไม่พบข้อมูลของรหัสนักศึกษานี้ในระบบ หากคิดว่าผิดพลาดกรุณาติดต่ออาจารย์ที่ปรึกษา',
  UNAUTHORIZED: 'ระบบเชื่อมต่อกับฐานข้อมูลไม่สำเร็จ (token ไม่ถูกต้อง)',
  NOT_CONFIGURED: 'ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheet',
  UPSTREAM_UNREACHABLE: 'ติดต่อฐานข้อมูลไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
  UPSTREAM_BAD_RESPONSE: 'ฐานข้อมูลตอบกลับผิดรูปแบบ กรุณาแจ้งผู้ดูแลระบบ',
};

const STATUS: Record<string, number> = {
  INVALID_ID: 400,
  NOT_FOUND: 404,
};

export async function GET(req: Request) {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', message: 'ค้นหาถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const id = new URL(req.url).searchParams.get('id') ?? '';

  try {
    const student = await getStudent(id);
    return NextResponse.json(
      { ok: true, student },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const code = err instanceof SheetError ? err.code : 'SERVER_ERROR';
    if (!(err instanceof SheetError) || !(code in MESSAGES)) {
      console.error('[api/student]', err);
    }
    return NextResponse.json(
      { ok: false, error: code, message: MESSAGES[code] ?? 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: STATUS[code] ?? 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
