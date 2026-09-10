import 'server-only';

import { parseCsv } from './csv';
import { buildAdvisorMap, normalizeSheetId, parseRecords } from './parse-sheet';
import { resolveStage } from './stages';
import type { PublicApplication, RawApplication, StudentResult } from './types';

/**
 * รองรับสองวิธีดึงข้อมูล เลือกอัตโนมัติจาก env ที่ตั้งไว้
 *
 *   โหมด CSV          ตั้ง SHEET_CSV_URL — อ่าน CSV จาก Google Sheet ตรง ๆ ไม่ต้องใช้ Apps Script
 *                     ต้องเปิดชีตให้อ่านได้แบบสาธารณะ (แชร์ลิงก์ หรือ Publish to web)
 *
 *   โหมด Apps Script  ตั้ง APPS_SCRIPT_URL + APPS_SCRIPT_TOKEN — ชีตยังเป็นส่วนตัวได้
 *
 * ถ้าตั้งไว้ทั้งคู่ โหมด CSV จะถูกใช้ก่อน
 */
const CSV_URL = process.env.SHEET_CSV_URL ?? '';
const ADVISOR_CSV_URL = process.env.SHEET_ADVISOR_CSV_URL ?? '';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ?? '';
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN ?? '';

/** ตั้ง SHOW_SENSITIVE_FIELDS=true เมื่อยอมรับความเสี่ยงว่าใครก็ตามที่รู้รหัส นศ. จะเห็นข้อมูลเหล่านี้ */
const SHOW_SENSITIVE = process.env.SHOW_SENSITIVE_FIELDS === 'true';

const CACHE_SECONDS = Number(process.env.SHEET_CACHE_SECONDS ?? '60');

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

async function fetchText(url: string, label: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    throw new SheetError('UPSTREAM_UNREACHABLE', `ติดต่อ ${label} ไม่ได้`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new SheetError('UPSTREAM_ERROR', `${label} ตอบกลับ ${res.status}`);
  }
  return res.text();
}

// ------------------------------------------------------------------ โหมด CSV

type CacheEntry = { at: number; records: RawApplication[] };

/**
 * cache ในหน่วยความจำของแต่ละ instance — CSV ก้อนหนึ่งราว 450KB
 * ถ้าไม่ cache จะต้องโหลดใหม่ทุกครั้งที่มีคนกดค้นหา
 */
let csvCache: CacheEntry | null = null;

async function loadCsvRecords(): Promise<RawApplication[]> {
  const now = Date.now();
  if (csvCache && now - csvCache.at < CACHE_SECONDS * 1000) {
    return csvCache.records;
  }

  const text = await fetchText(CSV_URL, 'Google Sheet');

  // ถ้าชีตไม่ได้เปิดให้อ่านสาธารณะ Google จะส่งหน้า HTML ให้ล็อกอินกลับมาแทน CSV
  if (text.trimStart().startsWith('<')) {
    throw new SheetError(
      'SHEET_NOT_PUBLIC',
      'Google ส่ง HTML กลับมาแทน CSV — ชีตยังไม่ได้เปิดให้อ่านแบบสาธารณะ',
    );
  }

  let advisorById: Record<string, string> = {};
  if (ADVISOR_CSV_URL) {
    try {
      const advisorText = await fetchText(ADVISOR_CSV_URL, 'ชีตอาจารย์ที่ปรึกษา');
      if (!advisorText.trimStart().startsWith('<')) {
        advisorById = buildAdvisorMap(parseCsv(advisorText));
      }
    } catch {
      // ชื่ออาจารย์เป็นข้อมูลเสริม ขาดไปก็ยังแสดงผลอย่างอื่นได้
    }
  }

  const records = parseRecords(parseCsv(text), advisorById);
  if (!records.length) {
    throw new SheetError(
      'SHEET_EMPTY',
      'อ่าน CSV ได้แต่ไม่พบแถวข้อมูลเลย — ตรวจว่า gid ชี้ไปแท็บที่มีข้อมูลจริง',
    );
  }

  csvCache = { at: now, records };
  return records;
}

// ----------------------------------------------------------- โหมด Apps Script

async function callAppsScript<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('token', APPS_SCRIPT_TOKEN);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const text = await fetchText(url.toString(), 'Google Apps Script');

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // ปกติเกิดตอน deployment ตั้ง access ไม่เป็น "Anyone" แล้ว Google ส่งหน้า login HTML กลับมา
    throw new SheetError(
      'UPSTREAM_BAD_RESPONSE',
      'Apps Script ไม่ได้ตอบเป็น JSON (ตรวจสิทธิ์ deployment)',
    );
  }

  const body = payload as { ok?: boolean; error?: string };
  if (!body?.ok) throw new SheetError(body?.error ?? 'UPSTREAM_ERROR');
  return payload as T;
}

// ---------------------------------------------------------------------- ผลลัพธ์

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

  let rows: RawApplication[];

  if (CSV_URL) {
    const all = await loadCsvRecords();
    rows = all.filter((r) => normalizeSheetId(r.id) === id);
  } else if (APPS_SCRIPT_URL && APPS_SCRIPT_TOKEN) {
    const data = await callAppsScript<{ applications: RawApplication[] }>({
      action: 'student',
      id,
    });
    rows = data.applications ?? [];
  } else {
    throw new SheetError(
      'NOT_CONFIGURED',
      'ยังไม่ได้ตั้งค่า SHEET_CSV_URL หรือ APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN',
    );
  }

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
