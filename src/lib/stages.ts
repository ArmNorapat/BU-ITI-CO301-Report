import type { StageKey } from './types';

export type StageDef = {
  key: StageKey;
  label: string;
  /** ลำดับใน timeline (0 = ยังไม่ระบุ, 1–5 = ขั้นปกติ, -1 = ต้องหาที่ใหม่) */
  step: number;
  description: string;
};

export const STAGE_DEFS: Record<Exclude<StageKey, 'unknown'>, StageDef> = {
  submitted: {
    key: 'submitted',
    label: 'ส่งประวัติให้บริษัท',
    step: 1,
    description: 'ประวัติของคุณถูกส่งให้สถานประกอบการแล้ว รอบริษัทเปิดพิจารณา',
  },
  reviewing: {
    key: 'reviewing',
    label: 'บริษัทกำลังพิจารณา',
    step: 2,
    description: 'สถานประกอบการรับประวัติไปแล้วและอยู่ระหว่างพิจารณา',
  },
  test: {
    key: 'test',
    label: 'ทำแบบทดสอบ',
    step: 3,
    description: 'บริษัทส่งแบบทดสอบมาให้ทำ กรุณาทำให้เสร็จภายในกำหนด',
  },
  interview: {
    key: 'interview',
    label: 'นัดสัมภาษณ์',
    step: 4,
    description: 'สถานประกอบการนัดสัมภาษณ์ ตรวจสอบวันเวลาในอีเมลของคุณ',
  },
  accepted: {
    key: 'accepted',
    label: 'สถานประกอบการตอบรับ',
    step: 5,
    description: 'ยินดีด้วย บริษัทตอบรับให้เข้าปฏิบัติงานสหกิจแล้ว',
  },
  rejected: {
    key: 'rejected',
    label: 'ต้องหาสถานประกอบการใหม่',
    step: -1,
    description: 'ผลการพิจารณาครั้งนี้ยังไม่ผ่าน กรุณาติดต่ออาจารย์ที่ปรึกษาเพื่อเลือกบริษัทใหม่',
  },
};

/**
 * ชีตเก็บสถานะเป็นข้อความไทยยาว ๆ ที่อาจถูกแก้คำได้เรื่อย ๆ จึงจับคู่ด้วยคำสำคัญ
 *
 * ลำดับในอาร์เรย์นี้คือลำดับความสำคัญ — ต้องเรียงจาก "เฉพาะเจาะจงที่สุด" ลงมา
 * เพราะข้อความจริงหลายอันมีคำซ้อนกัน เช่น
 *   "รอส่งประวัตินักศึกษาหาสถานประกอบการพิจารณา" มีทั้งคำว่า ส่งประวัติ และ พิจารณา
 *   ถ้าปล่อยให้กฎ "พิจารณา" ชนะ สถานะจะกระโดดไปขั้นที่ 2 ทั้งที่ยังอยู่ขั้นแรก
 */
const MATCH_RULES: { keywords: string[]; key: Exclude<StageKey, 'unknown'> }[] = [
  { keywords: ['หาสถานประกอบการใหม่', 'หาที่ใหม่', 'ไม่ผ่าน', 'ปฏิเสธ', 'ไม่รับ'], key: 'rejected' },
  { keywords: ['รอส่งประวัติ'], key: 'submitted' },
  { keywords: ['ตอบรับ', 'รับเข้า', 'ผ่านการคัดเลือก'], key: 'accepted' },
  { keywords: ['สัมภาษณ์', 'นัดพบ'], key: 'interview' },
  { keywords: ['แบบทดสอบ', 'ทำข้อสอบ'], key: 'test' },
  { keywords: ['กำลังพิจารณา', 'รอผลการพิจารณา', 'พิจารณา'], key: 'reviewing' },
  { keywords: ['ส่งประวัติ'], key: 'submitted' },
];

/** ขั้นตอนที่ใช้วาด timeline (ไม่รวม rejected ที่เป็นสถานะพิเศษ) */
export const TIMELINE_STEPS = (
  ['submitted', 'reviewing', 'test', 'interview', 'accepted'] as const
).map((key) => STAGE_DEFS[key]);

const UNKNOWN: StageDef = {
  key: 'unknown',
  label: 'ยังไม่ระบุสถานะ',
  step: 0,
  description: 'ยังไม่มีการบันทึกสถานะสำหรับใบสมัครนี้ กรุณาติดต่ออาจารย์ที่ปรึกษา',
};

/** แปลงข้อความสถานะดิบจากชีตเป็นขั้นตอนมาตรฐาน */
export function resolveStage(raw: string): StageDef {
  const text = (raw || '').trim();
  if (!text) return UNKNOWN;

  for (const rule of MATCH_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return STAGE_DEFS[rule.key];
  }

  // ไม่รู้จักคำนี้ — แสดงข้อความดิบจากชีตไปตรง ๆ ดีกว่าเดาผิด
  return { ...UNKNOWN, label: text };
}

/** สีที่ใช้กับ badge ของแต่ละสถานะ */
export function stageTone(key: StageKey): string {
  switch (key) {
    case 'accepted':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30';
    case 'interview':
      return 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/30';
    case 'test':
      return 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30';
    case 'reviewing':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30';
    case 'submitted':
      return 'bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30';
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-500/20 dark:bg-neutral-500/10 dark:text-neutral-300 dark:ring-neutral-400/30';
  }
}
