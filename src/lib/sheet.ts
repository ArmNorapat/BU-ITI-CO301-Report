import 'server-only';

import { resolveStage } from './stages';
import type {
  PublicApplication,
  RawApplication,
  Stats,
  StudentResult,
} from './types';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ?? '';
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN ?? '';

/** ตั้ง SHOW_SENSITIVE_FIELDS=true เมื่อยอมรับความเสี่ยงว่าใครก็ตามที่รู้รหัส นศ. จะเห็นข้อมูลเหล่านี้ */
const SHOW_SENSITIVE = process.env.SHOW_SENSITIVE_FIELDS === 'true';

export class SheetError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

/** รหัสนักศึกษาพิมพ์มาได้หลายแบบ (1650703844 หรือ 1-65-07-0384-4) ตัดให้เหลือแต่ตัวเลข */
export function normalizeId(input: string): string {
  return (input || '').replace(/\D/g, '');
}

async function callAppsScript<T>(params: Record<string, string>): Promise<T> {
  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_TOKEN) {
    throw new SheetError('NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN');
  }

  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('token', APPS_SCRIPT_TOKEN);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(url, {
      // Apps Script ตอบด้วย 302 ไป googleusercontent.com — fetch ตามให้อัตโนมัติ
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new SheetError('UPSTREAM_UNREACHABLE', 'ติดต่อ Google Apps Script ไม่ได้');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new SheetError('UPSTREAM_ERROR', `Apps Script ตอบกลับ ${res.status}`);
  }

  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // ปกติเกิดตอน deployment ตั้ง access ไม่เป็น "Anyone" แล้ว Google ส่งหน้า login HTML กลับมา
    throw new SheetError('UPSTREAM_BAD_RESPONSE', 'Apps Script ไม่ได้ตอบเป็น JSON (ตรวจสิทธิ์ deployment)');
  }

  const body = payload as { ok?: boolean; error?: string };
  if (!body?.ok) {
    throw new SheetError(body?.error ?? 'UPSTREAM_ERROR');
  }
  return payload as T;
}

/** ปกปิดอีเมลบางส่วน พอให้เจ้าของยืนยันได้ว่าเป็นของตัวเอง แต่คนอื่นเดาไม่ออก */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  const head = local.slice(0, 3);
  return `${head}${'*'.repeat(Math.max(local.length - 3, 1))}@${domain}`;
}

function toPublic(raw: RawApplication): PublicApplication {
  const stage = resolveStage(raw.stage);
  const isLink = (v: string) => /^https?:\/\//i.test((v || '').trim());

  const app: PublicApplication = {
    company: raw.company,
    position: raw.position,
    stage: raw.stage,
    stageKey: stage.key,
    stageLabel: stage.label,
    stageStep: stage.step,
    statusText: raw.statusText,
    registrationRequest: raw.registrationRequest,
    registrationStatus: raw.registrationStatus,
    letterStatus: raw.letterStatus,
    hasPortfolio: isLink(raw.portfolioUrl),
    hasDocuments: isLink(raw.documentsUrl),
    hasLinkedin: isLink(raw.linkedinUrl),
    portfolioUrl: isLink(raw.portfolioUrl) ? raw.portfolioUrl : '',
    linkedinUrl: isLink(raw.linkedinUrl) ? raw.linkedinUrl : '',
  };

  if (SHOW_SENSITIVE) {
    app.gpa = raw.gpa;
    app.phone = raw.phone;
    app.documentsUrl = isLink(raw.documentsUrl) ? raw.documentsUrl : '';
  }

  return app;
}

export async function getStudent(idInput: string): Promise<StudentResult> {
  const id = normalizeId(idInput);
  if (id.length < 8 || id.length > 12) {
    throw new SheetError('INVALID_ID', 'รูปแบบรหัสนักศึกษาไม่ถูกต้อง');
  }

  const data = await callAppsScript<{ applications: RawApplication[] }>({
    action: 'student',
    id,
  });

  const rows = data.applications ?? [];
  if (!rows.length) throw new SheetError('NOT_FOUND');

  // เรียงให้สถานะที่คืบหน้ามากที่สุดอยู่บนสุด
  const applications = rows.map(toPublic).sort((a, b) => b.stageStep - a.stageStep);
  const primary = rows[0];

  return {
    id,
    name: primary.name,
    department: primary.department,
    advisor: primary.advisor,
    semester: primary.semester,
    maskedEmail: maskEmail(primary.email),
    applications,
  };
}

export async function getStats(): Promise<Stats> {
  const data = await callAppsScript<{ stats: Stats }>({ action: 'stats' });
  return data.stats;
}
