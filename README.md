# BU ITI — ระบบตรวจผลการพิจารณาสหกิจศึกษา

เว็บให้นักศึกษากรอกรหัสนักศึกษาเพื่อดูผลการพิจารณาของสถานประกอบการที่สมัครไว้
ข้อมูลอ่านจาก Google Sheet ที่อาจารย์ที่ปรึกษาใช้ติดตามผลอยู่แล้ว ไม่ต้องย้ายฐานข้อมูล

```
นักศึกษา → Next.js (Vercel) → API route ฝั่งเซิร์ฟเวอร์ → Apps Script Web App → Google Sheet
```

เบราว์เซอร์คุยกับ Next.js เท่านั้น ไม่เห็น URL และ token ของ Apps Script

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `apps-script/Code.gs` | อ่าน Google Sheet แล้วเสิร์ฟ JSON |
| `src/lib/sheet.ts` | เรียก Apps Script + คัดกรองข้อมูลก่อนส่งให้เบราว์เซอร์ |
| `src/lib/stages.ts` | แปลงข้อความสถานะไทยเป็นขั้นตอนมาตรฐาน 5 ขั้น |
| `src/app/api/student/route.ts` | API ค้นหารายบุคคล (มี rate limit) |
| `src/app/api/stats/route.ts` | API สรุปภาพรวม |
| `src/app/page.tsx` | หน้าค้นหาสำหรับนักศึกษา |
| `src/app/stats/page.tsx` | หน้าภาพรวมทั้งรุ่น |

## ขั้นตอนติดตั้ง

### 1. ติดตั้ง Apps Script

1. เปิด Google Sheet → **Extensions › Apps Script**
2. วางเนื้อหาจาก `apps-script/Code.gs` ทับไฟล์ `Code.gs` เดิม
3. แก้ค่าใน `CONFIG`:
   - `SPREADSHEET_ID` — ตั้งไว้ให้แล้ว เปลี่ยนเมื่อย้ายไฟล์
   - `API_TOKEN` — **เปลี่ยนเป็นสตริงสุ่มยาว ๆ** (สร้างด้วย `openssl rand -hex 32`)
4. กด **Run › debugPreview** หนึ่งครั้งเพื่ออนุญาตสิทธิ์ แล้วดูใน Execution log ว่าอ่านข้อมูลได้กี่แถว
5. **Deploy › New deployment › Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. คัดลอก URL ที่ลงท้ายด้วย `/exec`

> ทุกครั้งที่แก้ `Code.gs` ต้อง **Deploy › Manage deployments › Edit › New version** ไม่งั้น URL เดิมยังรันโค้ดเก่าอยู่

ทดสอบว่าใช้ได้:

```bash
curl "https://script.google.com/macros/s/XXXX/exec?action=health"
```

### 2. รันบนเครื่อง

```bash
npm install
```

สร้างไฟล์ `.env.local` (คัดลอกจาก `.env.example`):

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
APPS_SCRIPT_TOKEN=<ค่าเดียวกับ API_TOKEN ใน Code.gs>
SHOW_SENSITIVE_FIELDS=false
```

```bash
npm run dev
```

### 3. Deploy ขึ้น Vercel

```bash
git push -u origin main
```

ที่ vercel.com → **Add New › Project** → เลือก repo นี้ → Framework ตรวจเจอ Next.js อัตโนมัติ
ก่อนกด Deploy ให้ใส่ Environment Variables ทั้ง 3 ตัวข้างบน (ทั้ง Production, Preview, Development)

หรือใช้ CLI:

```bash
npx vercel --prod
```

## เรื่องความเป็นส่วนตัวที่ต้องตัดสินใจ

ชีตต้นทางมีข้อมูลส่วนบุคคลปนอยู่ ได้แก่ **เบอร์โทรศัพท์, GPA และลิงก์ Google Drive ที่เก็บ Resume/Transcript**
(คอลัมน์นั้นในชีตเขียนกำกับไว้เองว่า "เอกสารส่วนบุคคล ห้ามเปิด")

ระบบนี้ยืนยันตัวตนด้วยรหัสนักศึกษาอย่างเดียว ซึ่งเป็นเลขที่เพื่อนร่วมชั้นเดาหรือหาได้ไม่ยาก
ค่าเริ่มต้นจึง**ไม่ส่งฟิลด์เหล่านั้นออกจากเซิร์ฟเวอร์เลย** และแสดงอีเมลแบบปิดบังบางส่วน (`dan*******@bumail.net`)
สิ่งที่นักศึกษาเห็นคือ ชื่อ สาขา อาจารย์ที่ปรึกษา บริษัท ตำแหน่ง สถานะ และบันทึกของอาจารย์

ถ้ายอมรับความเสี่ยงและต้องการให้แสดงครบ ตั้ง `SHOW_SENSITIVE_FIELDS=true`

ถ้าต้องการความปลอดภัยมากขึ้น ทางเลือกที่ตรงกับข้อมูลชุดนี้ที่สุดคือให้ล็อกอินด้วย Google
แล้วจับคู่อีเมลกับคอลัมน์ `Viewer_Email` — นักศึกษาจะเห็นได้เฉพาะข้อมูลของตัวเอง

## จุดที่ระบบยืดหยุ่นไว้แล้ว

- **รหัสนักศึกษา** รับได้ทั้ง `1650703844` และ `1-65-07-0384-4` (ตัดอักขระที่ไม่ใช่ตัวเลขทิ้ง)
- **ชื่อคอลัมน์** จับคู่แบบ "มีคำนี้อยู่ในหัวคอลัมน์" ไม่ใช่เทียบตรงตัว สลับตำแหน่งคอลัมน์ได้
- **แถวหัวข้อกลุ่ม** `สถานะ : ...` ใช้กำหนดสถานะให้ทุกแถวที่อยู่ใต้มัน และข้ามแถวหัวตารางที่วางซ้ำกลางชีต
- **ข้อความสถานะ** จับคู่ด้วยคำสำคัญตามลำดับความเฉพาะเจาะจง (ดู `MATCH_RULES` ใน `src/lib/stages.ts`)
  ถ้าอาจารย์เพิ่มสถานะใหม่ที่ไม่รู้จัก ระบบจะแสดงข้อความดิบแทนการเดาผิด — เพิ่มคำใหม่ได้ที่ไฟล์นั้น

## ข้อจำกัดที่ควรรู้

- Apps Script cache ผลไว้ 120 วินาที (`CONFIG.CACHE_SECONDS`) แก้ชีตแล้วเว็บจะตามภายในราว 2 นาที
- หน้าภาพรวม cache ที่ Vercel อีก 5 นาที (`revalidate` ใน `src/app/stats/page.tsx`)
- Rate limit เก็บใน memory ของแต่ละ instance กันคนกดรัวได้ระดับหนึ่ง แต่ไม่ใช่การป้องกันแบบจริงจัง
  ถ้าต้องการของจริงให้ย้ายไปใช้ Vercel KV หรือ Upstash Redis (`src/lib/rate-limit.ts`)
- โควตา Apps Script ฟรีอยู่ที่ราว 20,000 การเรียก/วัน เพียงพอกับนักศึกษาระดับหลักร้อย
