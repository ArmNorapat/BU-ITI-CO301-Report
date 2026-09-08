import { resolveStage, stageTone } from '@/lib/stages';
import { getStats } from '@/lib/sheet';
import type { StageKey, StatItem, Stats } from '@/lib/types';

export const revalidate = 300;

export const metadata = {
  title: 'ภาพรวมผลการพิจารณา | BU ITI',
};

export default async function StatsPage() {
  let stats: Stats | null = null;
  let failed = false;

  try {
    stats = await getStats();
  } catch {
    failed = true;
  }

  if (failed || !stats) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-xl font-semibold">ยังดูภาพรวมไม่ได้ในขณะนี้</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          ระบบเชื่อมต่อกับ Google Sheet ไม่สำเร็จ กรุณาลองใหม่อีกครั้งภายหลัง
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">ภาพรวมผลการพิจารณา</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          สรุปจำนวนรวมของทั้งรุ่น ไม่มีข้อมูลส่วนบุคคลของนักศึกษารายคน
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryTile label="นักศึกษาที่มีข้อมูลในระบบ" value={stats.totalStudents} />
        <SummaryTile label="ใบสมัครทั้งหมด" value={stats.totalApplications} />
      </div>

      <StageBreakdown items={stats.byStage} total={stats.totalApplications} />
      <BarList title="แยกตามสาขาวิชา" items={stats.byDepartment} />
      <BarList title="แยกตามอาจารย์ที่ปรึกษา" items={stats.byAdvisor} />
      <BarList title="สถานประกอบการที่มีผู้สมัครมากที่สุด" items={stats.topCompanies} />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value.toLocaleString('th-TH')}</p>
    </div>
  );
}

function StageBreakdown({ items, total }: { items: StatItem[]; total: number }) {
  // ชีตใช้ข้อความสถานะหลายแบบที่หมายถึงขั้นเดียวกัน
  // (เช่น "สถานประกอบการตอบรับแล้ว" กับ "ผ่านการคัดเลือก") จึงต้องรวมยอดก่อนแสดง
  const merged = new Map<string, { label: string; key: StageKey; step: number; count: number }>();

  for (const item of items) {
    const stage = resolveStage(item.label);
    // สถานะที่ระบบไม่รู้จักจะไม่ถูกยุบรวม เพราะแต่ละอันคือคนละเรื่องกัน
    const bucket = stage.key === 'unknown' ? `unknown:${item.label}` : stage.key;
    const existing = merged.get(bucket);
    if (existing) existing.count += item.count;
    else merged.set(bucket, { label: stage.label, key: stage.key, step: stage.step, count: item.count });
  }

  const rows = [...merged.values()].sort((a, b) => b.step - a.step || b.count - a.count);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold">แยกตามสถานะ</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => {
          const percent = total ? Math.round((row.count / total) * 100) : 0;
          return (
            <li key={row.label} className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${stageTone(row.key)}`}
              >
                {row.label}
              </span>
              <span className="ml-auto text-sm font-semibold tabular-nums">{row.count}</span>
              <span className="w-10 text-right text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                {percent}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BarList({ title, items }: { title: string; items: StatItem[] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 text-sm break-words">{item.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{item.count}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
