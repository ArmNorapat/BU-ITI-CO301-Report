/**
 * ตรวจการเชื่อมต่อระหว่างเว็บกับ Google Sheet
 *
 *   npm run check
 *   npm run check -- 1650705328     (ลองค้นหารหัสจริงด้วย)
 *
 * เลือกโหมดตาม env ที่ตั้งไว้ — SHEET_CSV_URL (อ่าน CSV ตรง) หรือ APPS_SCRIPT_URL
 * บอกให้ชัดว่าติดตรงไหนและต้องแก้ที่ไหน แทนที่จะเห็นแค่ "เชื่อมต่อไม่ได้"
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`    ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

/** ใช้หยุดการตรวจกลางคัน โดยไม่ต้องเรียก process.exit ระหว่างที่ยังมี I/O ค้างอยู่ */
class CheckFailed extends Error {}

/** ตั้งเป็น true เมื่อเจอปัญหาที่ไม่ถึงขั้นล้มเหลว แต่ไม่ควรบอกว่า "พร้อมใช้งาน" */
let hasWarning = false;

function fail(reason, fixes) {
  bad(reason);
  console.log('');
  console.log('\x1b[1m  วิธีแก้:\x1b[0m');
  for (const fix of fixes) console.log(`    • ${fix}`);
  console.log('');
  throw new CheckFailed();
}

/** อ่าน .env.local เอง จะได้ไม่ต้องลง dependency เพิ่ม */
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const at = trimmed.indexOf('=');
        if (at === -1) continue;
        const key = trimmed.slice(0, at).trim();
        if (!process.env[key]) process.env[key] = trimmed.slice(at + 1).trim();
      }
      return file;
    } catch {
      // ไม่มีไฟล์นี้ ลองไฟล์ถัดไป
    }
  }
  return null;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** อ่าน CSV แบบย่อ ใช้แค่นับแถวกับหารหัสนักศึกษาเพื่อวินิจฉัย */
function parseCsv(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const normId = (v) => (v ?? '').trim().replace(/\.0+$/, '').replace(/\D/g, '');

// ------------------------------------------------------------------ โหมด CSV

async function checkCsvMode(csvUrl, advisorUrl, probeId) {
  head('2. รูปแบบ URL');

  if (!/docs\.google\.com\/spreadsheets/.test(csvUrl)) {
    fail('SHEET_CSV_URL ไม่ใช่ URL ของ Google Sheets', [
      'รูปแบบที่ถูกต้อง: https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<gid>',
    ]);
  }
  if (!/output=csv|format=csv/.test(csvUrl)) {
    fail('URL ไม่ได้ขอผลลัพธ์เป็น CSV', [
      'ต้องมี format=csv (แบบ /export) หรือ output=csv (แบบ Publish to web) อยู่ใน URL',
    ]);
  }
  if (!/[?&]gid=\d+/.test(csvUrl)) {
    fail('URL ไม่ได้ระบุ gid ของแท็บ', [
      'เปิดแท็บที่ต้องการในเบราว์เซอร์ แล้วดูเลขหลัง #gid= ในแถบที่อยู่',
      'เอาเลขนั้นมาต่อท้าย URL เป็น &gid=<เลข>',
    ]);
  }
  ok('URL อยู่ในรูปแบบที่ถูกต้อง');

  head('3. โหลด CSV จาก Google Sheet');

  let res;
  try {
    res = await fetchText(csvUrl);
  } catch (err) {
    fail(`โหลด CSV ไม่สำเร็จ: ${err.message}`, ['ตรวจอินเทอร์เน็ต / พร็อกซีของเครื่อง']);
  }

  if (res.text.trimStart().startsWith('<')) {
    fail('Google ส่ง HTML กลับมาแทน CSV — ชีตยังไม่เปิดให้อ่านแบบสาธารณะ', [
      'เปิดชีต › Share › General access › Anyone with the link › Viewer',
      'หรือปลอดภัยกว่า: File › Share › Publish to web › เลือกเฉพาะแท็บที่ต้องการ › CSV',
      '  แล้วเอา URL ที่ได้ (แบบ /pub?gid=...&single=true&output=csv) มาใส่แทน',
    ]);
  }
  ok(`โหลด CSV ได้ (${(res.text.length / 1024).toFixed(0)} KB)`);

  head('4. อ่านโครงสร้างตาราง');

  const rows = parseCsv(res.text);
  if (rows.length < 2) {
    fail('CSV ไม่มีข้อมูล', ['ตรวจว่า gid ชี้ไปแท็บที่ถูกต้อง']);
  }

  const header = rows[0].map((h) => h.trim());
  const idCol = header.indexOf('ID') >= 0 ? header.indexOf('ID') : 0;
  const nameCol = header.indexOf('Name') >= 0 ? header.indexOf('Name') : 2;

  // ใช้กติกาเดียวกับ src/lib/parse-sheet.ts เพื่อให้ตัวเลขที่รายงานตรงกับที่แอปเห็นจริง
  const ids = new Set();
  for (const row of rows.slice(1)) {
    if (row.join(' ').includes('สถานะ :')) continue; // แถวหัวข้อกลุ่ม
    if ((row[idCol] ?? '').trim() === 'ID') continue; // หัวตารางที่วางซ้ำกลางชีต
    if (!(row[nameCol] ?? '').trim()) continue;
    const v = normId(row[idCol]);
    if (v.length >= 8) ids.add(v);
  }

  ok(`อ่านได้ ${rows.length} แถว / ${header.filter(Boolean).length} คอลัมน์`);

  if (ids.size === 0) {
    fail('ไม่พบรหัสนักศึกษาเลยในแท็บนี้', [
      'gid อาจชี้ไปผิดแท็บ — ตรวจว่าเป็นแท็บที่มีคอลัมน์ ID, Name, Company, Status',
    ]);
  }
  if (ids.size < 5) {
    hasWarning = true;
    bad(`พบรหัสนักศึกษาแค่ ${ids.size} คน — น่าจะชี้ผิดแท็บ`);
    info('แท็บที่เป็นเทมเพลตเปล่าจะมีข้อมูลตัวอย่างอยู่ไม่กี่แถว');
    info('ตรวจว่า gid ชี้ไปแท็บที่อาจารย์ใช้บันทึกผลจริง');
  } else {
    ok(`พบนักศึกษา ${ids.size} คน`);
  }

  if (advisorUrl) {
    try {
      const adv = await fetchText(advisorUrl);
      if (adv.text.trimStart().startsWith('<')) {
        hasWarning = true;
        bad('โหลดแท็บอาจารย์ที่ปรึกษาไม่ได้ (จะไม่แสดงชื่ออาจารย์)');
      } else {
        const advRows = parseCsv(adv.text);
        const mapped = advRows.slice(1).filter((r) => r[0]?.trim() && normId(r[1]).length >= 8);
        ok(`แท็บอาจารย์ที่ปรึกษา: จับคู่ได้ ${mapped.length} รายการ`);
      }
    } catch {
      hasWarning = true;
      bad('โหลดแท็บอาจารย์ที่ปรึกษาไม่ได้ (ไม่กระทบการใช้งานหลัก)');
    }
  }

  head('5. ทดลองค้นหา');

  if (ids.has(probeId)) {
    ok(`ค้นเจอรหัส ${probeId}`);
  } else {
    ok('เชื่อมต่อชีตได้แล้ว');
    info(`(รหัส ${probeId} ไม่มีในแท็บนี้ ลองใหม่ด้วย: npm run check -- <รหัสที่มีจริง>)`);
  }
}

// ----------------------------------------------------------- โหมด Apps Script

async function checkAppsScriptMode(url, token, probeId) {
  head('2. รูปแบบ URL');

  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url);
  if (isLocal) {
    ok(`ชี้ไปเซิร์ฟเวอร์บนเครื่อง (${url}) — ข้ามการตรวจรูปแบบ URL`);
  } else {
    if (!url.endsWith('/exec')) {
      fail(
        url.endsWith('/dev')
          ? 'URL ที่ลงท้าย /dev ใช้ได้เฉพาะเจ้าของบัญชีที่ล็อกอินอยู่ ต้องใช้ /exec เท่านั้น'
          : 'URL ต้องลงท้ายด้วย /exec',
        [
          'Deploy › Manage deployments › เลือก deployment › คัดลอก Web app URL',
          'URL ที่ถูกต้องหน้าตาแบบนี้: https://script.google.com/macros/s/AKfyc.../exec',
        ],
      );
    }
    if (!url.includes('script.google.com')) {
      fail('URL ไม่ใช่โดเมนของ Apps Script', ['ตรวจว่าคัดลอก Web app URL มาถูกช่อง']);
    }
    ok('URL ลงท้ายด้วย /exec และเป็นโดเมน script.google.com');
  }

  head('3. เรียก endpoint health (ไม่ใช้ token)');

  const healthUrl = new URL(url);
  healthUrl.searchParams.set('action', 'health');

  let health;
  try {
    health = await fetchText(healthUrl.toString());
  } catch (err) {
    fail(`ยิงไปที่ URL ไม่สำเร็จ: ${err.message}`, [
      'ตรวจอินเทอร์เน็ต / พร็อกซีของเครื่อง',
      'ลองเปิด URL ในเบราว์เซอร์ตรง ๆ ว่าตอบอะไรกลับมา',
    ]);
  }

  if (health.text.trimStart().startsWith('<')) {
    fail('Apps Script ส่ง HTML กลับมาแทน JSON', [
      'สิทธิ์ deployment ตั้งไม่ถูก — ต้องเป็น Who has access: Anyone',
      'แก้ที่ Deploy › Manage deployments › ไอคอนดินสอ › Who has access › Anyone › Deploy',
    ]);
  }

  let healthJson;
  try {
    healthJson = JSON.parse(health.text);
  } catch {
    fail('ตอบกลับมาไม่ใช่ JSON', [
      `HTTP ${health.status}`,
      `ตัวอย่างที่ได้รับ: ${health.text.slice(0, 200)}`,
    ]);
  }
  if (!healthJson.ok) {
    fail(`health ตอบ ok:false (${healthJson.error})`, [
      'วาง Code.gs เวอร์ชันล่าสุดลงใน Apps Script แล้ว Deploy ใหม่',
    ]);
  }
  ok(`Apps Script ตอบกลับแล้ว (${healthJson.service})`);

  head('4. ตรวจ token');

  const probeUrl = new URL(url);
  probeUrl.searchParams.set('action', 'student');
  probeUrl.searchParams.set('id', probeId);
  probeUrl.searchParams.set('token', token);

  const probe = await fetchText(probeUrl.toString());
  let probeJson;
  try {
    probeJson = JSON.parse(probe.text);
  } catch {
    fail('ตอบกลับมาไม่ใช่ JSON', [`ตัวอย่างที่ได้รับ: ${probe.text.slice(0, 200)}`]);
  }

  if (probeJson.error === 'UNAUTHORIZED') {
    fail('token ไม่ตรงกัน', [
      'ค่า APPS_SCRIPT_TOKEN ใน .env.local ต้องตรงกับ CONFIG.API_TOKEN ใน Code.gs เป๊ะ ๆ',
      'แก้ Code.gs แล้วต้อง Deploy › Manage deployments › Edit › New version ทุกครั้ง',
    ]);
  }
  ok('token ตรงกัน');

  head('5. อ่านข้อมูลจากชีต');

  if (probeJson.error === 'SERVER_ERROR') {
    fail(`Apps Script อ่านชีตไม่ได้: ${probeJson.message ?? ''}`, [
      'ตรวจ CONFIG.SPREADSHEET_ID ว่าตรงกับไฟล์จริง',
      'ตรวจ CONFIG.SHEET_NAME ว่าสะกดตรงกับชื่อแท็บในชีต',
      'เปิด Apps Script แล้วกด Run › debugPreview หนึ่งครั้งเพื่ออนุญาตสิทธิ์เข้าถึงชีต',
    ]);
  }
  if (probeJson.error === 'NOT_FOUND') {
    ok('เชื่อมต่อชีตได้แล้ว');
    info(`(รหัส ${probeId} ไม่มีในชีต ลองใหม่ด้วย: npm run check -- <รหัสที่มีจริง>)`);
  } else if (probeJson.ok) {
    ok(`เชื่อมต่อชีตได้แล้ว และค้นเจอรหัส ${probeId}`);
    info(`บริษัท: ${probeJson.applications?.[0]?.company ?? '-'}`);
  } else {
    fail(`ได้ error ที่ไม่รู้จัก: ${probeJson.error}`, ['ส่ง output นี้ให้ผู้ดูแลระบบดู']);
  }
}

// ---------------------------------------------------------------------- main

async function main() {
  const envFile = loadEnv();

  head('1. ตัวแปรสภาพแวดล้อม');

  if (!envFile) {
    fail('ไม่พบไฟล์ .env.local', [
      'คัดลอกไฟล์ตัวอย่าง:  cp .env.example .env.local',
      'แล้วกรอกค่า SHEET_CSV_URL',
    ]);
  }
  ok(`อ่านค่าจาก ${envFile}`);

  const csvUrl = process.env.SHEET_CSV_URL ?? '';
  const advisorUrl = process.env.SHEET_ADVISOR_CSV_URL ?? '';
  const scriptUrl = process.env.APPS_SCRIPT_URL ?? '';
  const token = process.env.APPS_SCRIPT_TOKEN ?? '';
  const probeId = process.argv[2]?.replace(/\D/g, '') || '1650705328';

  if (csvUrl) {
    ok('โหมด: อ่าน CSV จาก Google Sheet โดยตรง');
    await checkCsvMode(csvUrl, advisorUrl, probeId);
  } else if (scriptUrl && token) {
    if (token === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
      fail('APPS_SCRIPT_TOKEN ยังเป็นค่าตัวอย่าง', [
        'สร้างค่าสุ่ม:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
        'เอาค่าเดียวกันไปใส่ทั้งใน CONFIG.API_TOKEN ของ Code.gs และ .env.local',
      ]);
    }
    ok('โหมด: ผ่าน Google Apps Script');
    await checkAppsScriptMode(scriptUrl, token, probeId);
  } else {
    fail('ยังไม่ได้ตั้งค่าแหล่งข้อมูล', [
      'ตั้ง SHEET_CSV_URL เพื่ออ่าน CSV จากชีตโดยตรง (ง่ายที่สุด)',
      'หรือตั้ง APPS_SCRIPT_URL + APPS_SCRIPT_TOKEN เพื่อใช้ผ่าน Apps Script',
      'ดูตัวอย่างได้ที่ .env.example',
    ]);
  }

  if (hasWarning) {
    console.log('\n\x1b[33m\x1b[1mเชื่อมต่อได้ แต่มีข้อควรตรวจสอบข้างบน\x1b[0m');
    console.log('แก้ตามคำแนะนำแล้วรัน npm run check ซ้ำอีกครั้ง\n');
    process.exitCode = 1;
    return;
  }

  console.log('\n\x1b[32m\x1b[1mพร้อมใช้งาน\x1b[0m — รัน npm run dev ได้เลย');
  console.log('อย่าลืมใส่ค่าเดียวกันนี้ใน Environment Variables ของ Vercel ด้วย\n');
}

try {
  await main();
} catch (err) {
  if (!(err instanceof CheckFailed)) throw err;
  process.exitCode = 1;
}
