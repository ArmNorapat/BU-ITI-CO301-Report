/**
 * ตรวจการเชื่อมต่อระหว่างเว็บกับ Google Apps Script
 *
 *   npm run check
 *   npm run check -- 1650705328     (ลองค้นหารหัสจริงด้วย)
 *
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

async function call(url, params) {
  const target = new URL(url);
  for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(target, { redirect: 'follow', signal: controller.signal });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const envFile = loadEnv();

  head('1. ตัวแปรสภาพแวดล้อม');

  if (!envFile) {
    fail('ไม่พบไฟล์ .env.local', [
      'คัดลอกไฟล์ตัวอย่าง:  cp .env.example .env.local',
      'แล้วกรอกค่า APPS_SCRIPT_URL และ APPS_SCRIPT_TOKEN',
    ]);
  }
  ok(`อ่านค่าจาก ${envFile}`);

  const url = process.env.APPS_SCRIPT_URL ?? '';
  const token = process.env.APPS_SCRIPT_TOKEN ?? '';

  if (!url || url.includes('AKfycbxxxx')) {
    fail('APPS_SCRIPT_URL ยังเป็นค่าตัวอย่าง ยังไม่ได้ใส่ URL จริง', [
      'ใน Apps Script กด Deploy › New deployment › Web app',
      'คัดลอก "Web app URL" ที่ลงท้ายด้วย /exec มาใส่ใน .env.local',
    ]);
  }
  if (!token || token === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
    fail('APPS_SCRIPT_TOKEN ยังเป็นค่าตัวอย่าง', [
      'สร้างค่าสุ่ม:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      'เอาค่าเดียวกันไปใส่ทั้งใน CONFIG.API_TOKEN ของ Code.gs และ .env.local',
    ]);
  }
  ok('มี APPS_SCRIPT_URL และ APPS_SCRIPT_TOKEN ครบ');

  head('2. รูปแบบ URL');

  // ชี้ไป mock server บนเครื่องได้ ข้ามการตรวจรูปแบบ URL ของ Google ไป
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

  let health;
  try {
    health = await call(url, { action: 'health' });
  } catch (err) {
    fail(`ยิงไปที่ URL ไม่สำเร็จ: ${err.message}`, [
      'ตรวจอินเทอร์เน็ต / พร็อกซีของเครื่อง',
      'ลองเปิด URL ในเบราว์เซอร์ตรง ๆ ว่าตอบอะไรกลับมา',
    ]);
  }

  if (health.text.trimStart().startsWith('<')) {
    const isLogin = /accounts\.google\.com|ContinueSignIn|Sign in/i.test(health.text);
    fail(
      isLogin
        ? 'Apps Script ส่งหน้า login ของ Google กลับมาแทน JSON'
        : 'Apps Script ส่ง HTML กลับมาแทน JSON',
      [
        'สิทธิ์ deployment ตั้งไม่ถูก — ต้องเป็น Who has access: Anyone',
        'แก้ที่ Deploy › Manage deployments › ไอคอนดินสอ › Who has access › Anyone › Deploy',
        'ถ้าองค์กรล็อกไว้ไม่ให้เลือก Anyone ให้ใช้บัญชี Google ส่วนตัวสร้าง deployment แทน',
      ],
    );
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

  const probeId = process.argv[2]?.replace(/\D/g, '') || '1650705328';
  const probe = await call(url, { action: 'student', id: probeId, token });

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
      '  ไม่งั้น URL เดิมจะยังรันโค้ดเวอร์ชันเก่าอยู่',
    ]);
  }
  ok('token ตรงกัน');

  head('5. อ่านข้อมูลจากชีต');

  if (probeJson.error === 'SERVER_ERROR') {
    fail(`Apps Script อ่านชีตไม่ได้: ${probeJson.message ?? ''}`, [
      'ตรวจ CONFIG.SPREADSHEET_ID ว่าตรงกับไฟล์จริง',
      'ตรวจ CONFIG.SHEET_NAME ว่าสะกดตรงกับชื่อแท็บในชีต (ค่าเริ่มต้นคือ comfirm_data)',
      'เปิด Apps Script แล้วกด Run › debugPreview หนึ่งครั้งเพื่ออนุญาตสิทธิ์เข้าถึงชีต',
    ]);
  }

  if (probeJson.error === 'NOT_FOUND') {
    ok('เชื่อมต่อชีตได้แล้ว');
    info(`(รหัส ${probeId} ไม่มีในชีต ลองใหม่ด้วย: npm run check -- <รหัสที่มีจริง>)`);
  } else if (probeJson.ok) {
    const app = probeJson.applications?.[0];
    ok(`เชื่อมต่อชีตได้แล้ว และค้นเจอรหัส ${probeId}`);
    info(`ชื่อ: ${app?.name ?? '-'}`);
    info(`บริษัท: ${app?.company ?? '-'}`);
    info(`สถานะ: ${app?.stage ?? '-'}`);
  } else {
    fail(`ได้ error ที่ไม่รู้จัก: ${probeJson.error}`, ['ส่ง output นี้ให้ผู้ดูแลระบบดู']);
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
