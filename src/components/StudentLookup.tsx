'use client';

import { Fragment, useEffect, useState } from 'react';

import { ACADEMIC_YEAR, SITE_HEADING_PARTS } from '@/lib/site';
import type { StudentResult } from '@/lib/types';

import { ApplicationCard } from './ApplicationCard';

type ApiResponse =
  | { ok: true; student: StudentResult }
  | { ok: false; error: string; message?: string };

const STORAGE_KEY = 'co301:last-id';

export function StudentLookup() {
  const [rawId, setRawId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState<StudentResult | null>(null);

  // จำรหัสล่าสุดไว้ให้ ไม่ต้องพิมพ์ซ้ำทุกครั้งที่เข้ามาเช็ค
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRawId(saved);
    } catch {
      // เบราว์เซอร์ปิด storage ไว้ — ข้ามไป
    }
  }, []);

  const digits = rawId.replace(/\D/g, '');
  const canSubmit = digits.length >= 8 && digits.length <= 12 && !loading;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    setStudent(null);

    try {
      const res = await fetch(`/api/student?id=${encodeURIComponent(digits)}`);
      const data: ApiResponse = await res.json();

      if (!data.ok) {
        setError(data.message || 'ค้นหาข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }

      setStudent(data.student);
      try {
        localStorage.setItem(STORAGE_KEY, digits);
      } catch {
        // ไม่สำคัญพอที่จะทำให้การค้นหาล้มเหลว
      }
    } catch {
      setError('เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl leading-snug font-bold text-balance sm:text-4xl">
          {SITE_HEADING_PARTS.map((part, i) => (
            <Fragment key={part}>
              {i > 0 ? <wbr /> : null}
              <span className="whitespace-nowrap">{part}</span>
            </Fragment>
          ))}{' '}
          <span className="block text-indigo-600 dark:text-indigo-400">
            ปีการศึกษา {ACADEMIC_YEAR}
          </span>
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-400">
          กรอกรหัสนักศึกษาเพื่อดูสถานะล่าสุดของสถานประกอบการที่คุณสมัครไว้
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="student-id" className="sr-only">
              รหัสนักศึกษา
            </label>
            <input
              id="student-id"
              value={rawId}
              onChange={(e) => setRawId(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="เช่น 1650703844"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg tabular-nums outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'กำลังค้นหา…' : 'ตรวจสอบ'}
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          พิมพ์ได้ทั้งแบบ <span className="whitespace-nowrap">1650703844</span> และ{' '}
          <span className="whitespace-nowrap">1-65-07-0384-4</span>
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-base text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"
          >
            {error}
          </p>
        ) : null}
      </section>

      {student ? <StudentPanel student={student} /> : null}
    </div>
  );
}

function StudentPanel({ student }: { student: StudentResult }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-semibold break-words">{student.name}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
              รหัสนักศึกษา
            </dt>
            <dd className="mt-0.5 text-base tabular-nums">{student.id}</dd>
          </div>
          {student.department ? (
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">สาขาวิชา</dt>
              <dd className="mt-0.5 text-base">{student.department}</dd>
            </div>
          ) : null}
          {student.advisor ? (
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                อาจารย์ที่ปรึกษาสหกิจ
              </dt>
              <dd className="mt-0.5 text-base">{student.advisor}</dd>
            </div>
          ) : null}
          {student.semester ? (
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                ภาคการศึกษาที่ออกฝึก
              </dt>
              <dd className="mt-0.5 text-base">{student.semester}</dd>
            </div>
          ) : null}
          {student.maskedEmail ? (
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                อีเมลที่ใช้ติดต่อ
              </dt>
              <dd className="mt-0.5 text-base break-all">{student.maskedEmail}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {student.applications.map((app, i) => (
        <ApplicationCard key={`${app.company}-${i}`} app={app} index={i} />
      ))}

      <p className="flex gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-slate-300">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 size-5 shrink-0 text-indigo-500 dark:text-indigo-400"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          ขอให้เข้ามาตรวจสอบสถานะอย่างต่อเนื่อง
          และหากมีคำถามติดต่ออาจารย์ที่ปรึกษาพร้อมข้อมูลของนักศึกษา
        </span>
      </p>
    </div>
  );
}
