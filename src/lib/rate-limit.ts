/**
 * Rate limit แบบง่ายเก็บใน memory
 *
 * ข้อจำกัดที่ต้องรู้: Vercel รัน serverless หลาย instance และ instance ถูก recycle ได้
 * ตัวนับจึงไม่ได้แชร์กันทั้งระบบ — พอกันคนกดรัวหรือสคริปต์ไล่ยิงรหัสแบบหยาบ ๆ เท่านั้น
 * ถ้าต้องการกันจริงจัง ให้ย้ายไปใช้ Upstash Redis หรือ Vercel KV
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 5_000) pruneExpired(now);
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
