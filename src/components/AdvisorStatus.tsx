'use client';

import { useId, useState } from 'react';

const PREVIEW_LINES = 6;

function IconMegaphone() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 shrink-0" aria-hidden>
      <path d="M16.9 3.3a1 1 0 0 1 1.6.8v15.8a1 1 0 0 1-1.6.8L12 17H9.3l.9 3.4a1 1 0 0 1-1 1.3H7.6a1 1 0 0 1-1-.8L5.4 17H5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h7l4.9-3.7ZM20.5 9.2a1 1 0 0 1 1.4 0 4 4 0 0 1 0 5.6 1 1 0 1 1-1.4-1.4 2 2 0 0 0 0-2.8 1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

/**
 * สถานะของนักศึกษาคือข้อความที่อาจารย์ที่ปรึกษาเขียนไว้ในคอลัมน์ Status ตรง ๆ
 * ไม่แปลงหรือจัดกลุ่ม — อาจารย์เขียนอะไร นักศึกษาเห็นอย่างนั้น
 *
 * ข้อความเป็น log สะสม บางคนยาวหลายสิบบรรทัด จึงแสดงช่วงต้นก่อนแล้วให้กดขยายเอง
 */
export function AdvisorStatus({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  // นักศึกษาที่มีหลายใบสมัครจะมีกล่องนี้หลายอัน id ต้องไม่ซ้ำกัน
  const headingId = useId();

  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '' && !/^[.…\-_=]{10,}$/.test(line.trim()))
    .map((line) => line.replace(/^[-•]\s*/, ''));

  const overflowing = lines.length > PREVIEW_LINES;
  const shown = expanded || !overflowing ? lines : lines.slice(0, PREVIEW_LINES);

  return (
    <section
      aria-labelledby={headingId}
      className="mt-5 overflow-hidden rounded-2xl border-2 border-indigo-500 shadow-lg shadow-indigo-500/15 dark:border-indigo-400/70 dark:shadow-indigo-950/40"
    >
      <header className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-white">
        <IconMegaphone />
        <div className="min-w-0">
          <h4 id={headingId} className="text-xl leading-tight font-bold">
            สถานะล่าสุด
          </h4>
          <p className="text-sm text-indigo-100">จากอาจารย์ที่ปรึกษา</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950">
          สำคัญ
        </span>
      </header>

      <div className="bg-indigo-50 px-5 py-5 dark:bg-indigo-950/40">
        {lines.length ? (
          <ul className="flex flex-col gap-3">
            {shown.map((line, i) => (
              <li
                key={i}
                className="text-lg leading-relaxed font-medium break-words text-slate-900 sm:text-xl dark:text-slate-100"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-lg text-slate-600 dark:text-slate-300">
            ยังไม่มีบันทึกจากอาจารย์ที่ปรึกษา
          </p>
        )}

        {overflowing ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-base font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          >
            {expanded
              ? 'ย่อบันทึก'
              : `ดูบันทึกทั้งหมด (อีก ${lines.length - PREVIEW_LINES} บรรทัด)`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
