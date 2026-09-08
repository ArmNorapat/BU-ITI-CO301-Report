'use client';

import { useState } from 'react';

const PREVIEW_LINES = 6;

/**
 * ช่อง Status ในชีตคือ log สะสมของอาจารย์ บางคนยาวเป็นสิบบรรทัด
 * และบรรทัดใหม่สุดอยู่บนสุด จึงแสดงเฉพาะช่วงต้นก่อน แล้วให้กดขยายเอง
 */
export function StatusLog({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '' && !/^[.…\-_=]{10,}$/.test(line.trim()));

  if (!lines.length) return null;

  const overflowing = lines.length > PREVIEW_LINES;
  const shown = expanded || !overflowing ? lines : lines.slice(0, PREVIEW_LINES);

  return (
    <div className="mt-5 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
        บันทึกจากอาจารย์ที่ปรึกษา
        {overflowing ? (
          <span className="ml-1 font-normal">(ล่าสุดอยู่บนสุด)</span>
        ) : null}
      </p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {shown.map((line, i) => (
          <li
            key={i}
            className="text-sm leading-relaxed break-words text-neutral-800 dark:text-neutral-200"
          >
            {line.replace(/^[-•]\s*/, '')}
          </li>
        ))}
      </ul>

      {overflowing ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-medium text-orange-600 underline-offset-2 hover:underline dark:text-orange-400"
        >
          {expanded ? 'ย่อบันทึก' : `ดูบันทึกทั้งหมด (อีก ${lines.length - PREVIEW_LINES} บรรทัด)`}
        </button>
      ) : null}
    </div>
  );
}
