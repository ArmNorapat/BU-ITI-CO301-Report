/**
 * BU ITI CO301 — Co-op Placement Report API (Google Apps Script)
 * ---------------------------------------------------------------
 * อ่านข้อมูลจาก Google Sheet แล้วเสิร์ฟเป็น JSON ให้เว็บ Next.js บน Vercel
 *
 * Endpoints (GET):
 *   ?action=health
 *   ?action=student&id=<รหัสนักศึกษา>&token=<API_TOKEN>
 *   ?action=stats&token=<API_TOKEN>
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone
 * แล้วเอา URL /exec ไปใส่ env APPS_SCRIPT_URL ของฝั่ง Next.js
 */

const CONFIG = {
  // ไอดีของ Google Sheet (ส่วนที่อยู่ระหว่าง /d/ กับ /edit ใน URL)
  SPREADSHEET_ID: '13SMQTIlSw2BHjy0LcTX_S0qiz6CGDNDx_8rsqAAeQj8',

  // ชีตหลัก: มีแถวหัวข้อกลุ่ม "สถานะ : ..." คั่นระหว่างบล็อกข้อมูล
  SHEET_NAME: 'comfirm_data',

  // ชีตสำรองไว้ map รหัสนักศึกษา -> อาจารย์ที่ปรึกษา (คอลัมน์ A = อาจารย์, B = ID)
  ADVISOR_SHEET_NAME: 'อาจารย์ที่ปรึกษา',

  // ต้องตรงกับ env APPS_SCRIPT_TOKEN ฝั่ง Next.js — เปลี่ยนเป็นค่าสุ่มยาว ๆ ของคุณเอง
  API_TOKEN: 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',

  // cache ผลลัพธ์กี่วินาที (ลดการอ่านชีตซ้ำ ทำให้ API เร็วขึ้นมาก)
  CACHE_SECONDS: 120,
};

/** ป้ายกำกับกลุ่มสถานะที่ใช้คั่นบล็อกในชีต */
var GROUP_MARKER = 'สถานะ :';

// ---------------------------------------------------------------- entrypoint

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'health';

  try {
    if (action === 'health') {
      return json({ ok: true, service: 'co301-report', time: new Date().toISOString() });
    }

    if (params.token !== CONFIG.API_TOKEN) {
      return json({ ok: false, error: 'UNAUTHORIZED' });
    }

    if (action === 'student') {
      var id = normalizeId(params.id);
      if (!id || id.length < 8) return json({ ok: false, error: 'INVALID_ID' });

      var found = getRecords().filter(function (r) { return r.id === id; });
      if (!found.length) return json({ ok: false, error: 'NOT_FOUND' });

      // นักศึกษาหนึ่งคนอาจสมัครหลายบริษัท จึงส่งกลับทุกใบสมัคร
      return json({ ok: true, id: id, applications: found });
    }

    if (action === 'stats') {
      return json({ ok: true, stats: buildStats(getRecords()) });
    }

    return json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json({
      ok: false,
      error: 'SERVER_ERROR',
      message: String((err && err.message) || err),
    });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------ reading

/** อ่านชีตแล้วแปลงเป็น array ของ record (ผ่าน cache) */
function getRecords() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('records_v1');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (ignored) {
      // cache เสีย -> อ่านใหม่
    }
  }

  var records = readRecords();

  try {
    cache.put('records_v1', JSON.stringify(records), CONFIG.CACHE_SECONDS);
  } catch (ignored) {
    // เกินขีดจำกัด 100KB ของ CacheService -> ข้าม cache ไป อ่านสดทุกครั้งแทน
  }
  return records;
}

function readRecords() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีตชื่อ ' + CONFIG.SHEET_NAME);

  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];

  var cols = mapColumns(values[0]);
  var advisorById = readAdvisorMap(ss);
  var out = [];
  var stage = '';

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var joined = row.join(' ').trim();
    if (!joined) continue;

    // แถวหัวข้อกลุ่ม เช่น "สถานะ :  สถานประกอบการตอบรับแล้ว"
    if (joined.indexOf(GROUP_MARKER) !== -1) {
      stage = extractStage(row);
      continue;
    }

    // แถวหัวตารางที่ถูกวางซ้ำกลางชีต
    if (pick(row, cols.id) === 'ID') continue;

    var id = normalizeId(row[cols.id]);
    if (id.length < 8) continue;

    var name = pick(row, cols.name);
    if (!name) continue;

    out.push({
      id: id,
      no: pick(row, cols.no),
      name: name,
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
      stage: stage,
      rowNumber: i + 1,
    });
  }

  return out;
}

/** ชีต "อาจารย์ที่ปรึกษา": คอลัมน์ A = ชื่ออาจารย์, คอลัมน์ B = รหัสนักศึกษา */
function readAdvisorMap(ss) {
  var map = {};
  var sheet = ss.getSheetByName(CONFIG.ADVISOR_SHEET_NAME);
  if (!sheet) return map;

  var values = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < values.length; i++) {
    var advisor = String(values[i][0] || '').trim();
    var id = normalizeId(values[i][1]);
    if (advisor && id.length >= 8 && !map[id]) map[id] = advisor;
  }
  return map;
}

// ---------------------------------------------------------------- utilities

/** จับคู่ชื่อหัวคอลัมน์ (ยืดหยุ่นกับช่องว่างและข้อความต่อท้าย) เป็นเลข index */
function mapColumns(header) {
  var norm = header.map(function (h) {
    return String(h || '').replace(/\s+/g, ' ').trim().toLowerCase();
  });

  function findExact(label) {
    return norm.indexOf(String(label).toLowerCase());
  }

  function findContains(fragment) {
    var needle = String(fragment).toLowerCase();
    for (var i = 0; i < norm.length; i++) {
      if (norm[i] && norm[i].indexOf(needle) !== -1) return i;
    }
    return -1;
  }

  function first() {
    for (var a = 0; a < arguments.length; a++) {
      if (arguments[a] >= 0) return arguments[a];
    }
    return -1;
  }

  return {
    id: first(findExact('id'), 0),
    no: findExact('no.'),
    name: first(findExact('name'), 2),
    company: findExact('company'),
    position: findExact('position'),
    status: findExact('status'),
    department: findExact('department'),
    gpa: findContains('gpa'),
    semester: findContains('ภาคการศึกษา'),
    email: findContains('viewer_email'),
    phone: findContains('เบอร์โทรศัพท์'),
    portfolio: findContains('portfolio'),
    documents: findContains('resume'),
    linkedin: findContains('linkedin'),
    regRequest: findContains('คำขอลงทะเบียน'),
    regStatus: findContains('สถานะอนุมัติการลงทะเบียน'),
    letterStatus: findContains('สถานะการส่งจดหมาย'),
    advisor: findContains('อาจารย์ที่ปรึกษา'),
  };
}

function pick(row, index) {
  if (index === undefined || index === null || index < 0 || index >= row.length) return '';
  var v = row[index];
  return String(v === null || v === undefined ? '' : v).trim();
}

/** ดึงข้อความสถานะออกจากแถวหัวข้อกลุ่ม */
function extractStage(row) {
  for (var i = 0; i < row.length; i++) {
    var cell = String(row[i] || '');
    var at = cell.indexOf(GROUP_MARKER);
    if (at !== -1) {
      return cell.slice(at + GROUP_MARKER.length).split('\n')[0].replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

/**
 * รหัสนักศึกษาในชีตมีหลายรูปแบบ: 1650703844 / "1650703844.0" / "1-65-07-0014-7"
 * ทุกแบบต้องแปลงให้เป็นเลข 10 หลักชุดเดียวกัน
 */
function normalizeId(value) {
  if (value === null || value === undefined) return '';
  var s = (typeof value === 'number') ? String(Math.round(value)) : String(value).trim();
  s = s.replace(/\.0+$/, '');
  return s.replace(/\D/g, '');
}

// -------------------------------------------------------------------- stats

function buildStats(records) {
  var byStage = {};
  var byDepartment = {};
  var byAdvisor = {};
  var byCompany = {};
  var studentIds = {};

  records.forEach(function (r) {
    studentIds[r.id] = true;
    bump(byStage, r.stage || 'ไม่ระบุสถานะ');
    bump(byDepartment, r.department || 'ไม่ระบุสาขา');
    bump(byAdvisor, r.advisor || 'ยังไม่ระบุอาจารย์');
    if (r.company) bump(byCompany, r.company);
  });

  return {
    totalApplications: records.length,
    totalStudents: Object.keys(studentIds).length,
    byStage: toSortedList(byStage),
    byDepartment: toSortedList(byDepartment),
    byAdvisor: toSortedList(byAdvisor),
    topCompanies: toSortedList(byCompany).slice(0, 15),
    updatedAt: new Date().toISOString(),
  };
}

function bump(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function toSortedList(obj) {
  return Object.keys(obj)
    .map(function (k) { return { label: k, count: obj[k] }; })
    .sort(function (a, b) { return b.count - a.count; });
}

// --------------------------------------------------------------- dev helper

/** รันจากใน editor เพื่อตรวจว่าพาร์สชีตได้ถูกต้องหรือไม่ */
function debugPreview() {
  var records = readRecords();
  Logger.log('records: %s', records.length);
  Logger.log('stages: %s', JSON.stringify(buildStats(records).byStage, null, 2));
  Logger.log('sample: %s', JSON.stringify(records[0], null, 2));
}
