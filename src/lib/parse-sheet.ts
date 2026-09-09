import type { RawApplication } from './types';

/**
 * แปลงตารางดิบจากชีตให้เป็นรายการใบสมัคร
 *
 * ตรรกะเดียวกับที่อยู่ใน apps-script/Code.gs เป๊ะ ๆ ต่างกันแค่ที่นี่รับข้อมูลจาก CSV
 * ส่วนฝั่ง Apps Script รับจาก getDisplayValues() ของ Sheets API
 */

/** แถวหัวข้อกลุ่มในชีตหน้าตาแบบ "สถานะ :  สถานประกอบการตอบรับแล้ว" */
const GROUP_MARKER = 'สถานะ :';

/**
 * รหัสนักศึกษาในชีตมีหลายรูปแบบ: 1650703844 / "1650703844.0" / "1-65-07-0384-4"
 * ทุกแบบต้องแปลงให้เป็นเลข 10 หลักชุดเดียวกัน
 */
export function normalizeSheetId(value: string): string {
  return (value ?? '')
    .trim()
    .replace(/\.0+$/, '')
    .replace(/\D/g, '');
}

type ColumnMap = ReturnType<typeof mapColumns>;

/** จับคู่ชื่อหัวคอลัมน์เป็นเลข index แบบยืดหยุ่น เผื่ออาจารย์สลับหรือแก้ข้อความหัวคอลัมน์ */
function mapColumns(header: string[]) {
  const norm = header.map((h) => (h ?? '').replace(/\s+/g, ' ').trim().toLowerCase());

  const exact = (label: string) => norm.indexOf(label.toLowerCase());
  const contains = (fragment: string) => {
    const needle = fragment.toLowerCase();
    return norm.findIndex((h) => h && h.includes(needle));
  };
  const first = (...candidates: number[]) => candidates.find((i) => i >= 0) ?? -1;

  return {
    id: first(exact('id'), 0),
    no: exact('no.'),
    name: first(exact('name'), 2),
    company: exact('company'),
    position: exact('position'),
    status: exact('status'),
    department: exact('department'),
    gpa: contains('gpa'),
    semester: contains('ภาคการศึกษา'),
    email: contains('viewer_email'),
    phone: contains('เบอร์โทรศัพท์'),
    portfolio: contains('portfolio'),
    documents: contains('resume'),
    linkedin: contains('linkedin'),
    regRequest: contains('คำขอลงทะเบียน'),
    regStatus: contains('สถานะอนุมัติการลงทะเบียน'),
    letterStatus: contains('สถานะการส่งจดหมาย'),
    advisor: contains('อาจารย์ที่ปรึกษา'),
  };
}

function pick(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  return (row[index] ?? '').trim();
}

/** ดึงข้อความสถานะออกจากแถวหัวข้อกลุ่ม */
function extractStage(row: string[]): string {
  for (const cell of row) {
    const at = (cell ?? '').indexOf(GROUP_MARKER);
    if (at !== -1) {
      return cell
        .slice(at + GROUP_MARKER.length)
        .split('\n')[0]
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return '';
}

/** ชีต "อาจารย์ที่ปรึกษา": คอลัมน์ A = ชื่ออาจารย์, คอลัมน์ B = รหัสนักศึกษา */
export function buildAdvisorMap(rows: string[][]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows.slice(1)) {
    const advisor = (row[0] ?? '').trim();
    const id = normalizeSheetId(row[1] ?? '');
    if (advisor && id.length >= 8 && !map[id]) map[id] = advisor;
  }
  return map;
}

export function parseRecords(
  rows: string[][],
  advisorById: Record<string, string> = {},
): RawApplication[] {
  if (!rows.length) return [];

  const cols: ColumnMap = mapColumns(rows[0]);
  const out: RawApplication[] = [];
  let stage = '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const joined = row.join(' ').trim();
    if (!joined) continue;

    // แถวหัวข้อกลุ่มกำหนดสถานะให้ทุกแถวที่อยู่ใต้มัน จนกว่าจะเจอหัวข้อกลุ่มถัดไป
    if (joined.includes(GROUP_MARKER)) {
      stage = extractStage(row);
      continue;
    }

    // แถวหัวตารางที่ถูกวางซ้ำกลางชีต
    if (pick(row, cols.id) === 'ID') continue;

    const id = normalizeSheetId(pick(row, cols.id));
    if (id.length < 8) continue;

    const name = pick(row, cols.name);
    if (!name) continue;

    out.push({
      id,
      no: pick(row, cols.no),
      name,
      company: pick(row, cols.company),
      position: pick(row, cols.position),
      statusText: pick(row, cols.status),
      department: pick(row, cols.department),
      gpa: pick(row, cols.gpa),
      semester: pick(row, cols.semester),
      email: pick(row, cols.email).toLowerCase(),
      phone: pick(row, cols.phone),
      portfolioUrl: pick(row, cols.portfolio),
      documentsUrl: pick(row, cols.documents),
      linkedinUrl: pick(row, cols.linkedin),
      registrationRequest: pick(row, cols.regRequest),
      registrationStatus: pick(row, cols.regStatus),
      letterStatus: pick(row, cols.letterStatus),
      advisor: pick(row, cols.advisor) || advisorById[id] || '',
      stage,
      rowNumber: i + 1,
    });
  }

  return out;
}
