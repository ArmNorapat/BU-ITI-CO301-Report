/**
 * ตัวอ่าน CSV ตามมาตรฐาน RFC 4180
 *
 * เขียนเองแทนการลง dependency เพราะต้องรองรับเคสที่ชีตนี้มีจริง:
 * ช่อง Status เป็นบันทึกหลายบรรทัดที่มีทั้งขึ้นบรรทัดใหม่ คอมมา และเครื่องหมายคำพูดอยู่ข้างใน
 */
export function parseCsv(input: string): string[][] {
  // ตัด BOM ที่ Google ใส่มาหน้าไฟล์ ไม่งั้นหัวคอลัมน์แรกจะไม่ตรง
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // "" ข้างในเครื่องหมายคำพูด = อักขระ " หนึ่งตัว
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // กิน \r\n ให้เป็นการขึ้นบรรทัดเดียว
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่ได้ปิดท้ายด้วยการขึ้นบรรทัดใหม่
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
