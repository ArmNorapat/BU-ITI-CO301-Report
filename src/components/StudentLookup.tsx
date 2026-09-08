'use client';

import { useEffect, useState } from 'react';

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
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-bold sm:text-3xl">ตรวจผลการพิจารณาสหกิจศึกษา</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
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
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base tabular-nums outline-none transition placeholder:text-neutral-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-orange-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'กำลังค้นหา…' : 'ตรวจสอบ'}
          </button>
        </form>

        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          พิมพ์ได้ทั้งแบบ 1650703844 และ 1-65-07-0384-4
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"
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
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold break-words">{student.name}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              รหัสนักศึกษา
            </dt>
            <dd className="mt-0.5 text-sm tabular-nums">{student.id}</dd>
          </div>
          {student.department ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">สาขาวิชา</dt>
              <dd className="mt-0.5 text-sm">{student.department}</dd>
            </div>
          ) : null}
          {student.advisor ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                อาจารย์ที่ปรึกษาสหกิจ
              </dt>
              <dd className="mt-0.5 text-sm">{student.advisor}</dd>
            </div>
          ) : null}
          {student.semester ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                ภาคการศึกษาที่ออกฝึก
              </dt>
              <dd className="mt-0.5 text-sm">{student.semester}</dd>
            </div>
          ) : null}
          {student.maskedEmail ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                อีเมลที่ใช้ติดต่อ
              </dt>
              <dd className="mt-0.5 text-sm break-all">{student.maskedEmail}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {student.applications.map((app, i) => (
        <ApplicationCard key={`${app.company}-${i}`} app={app} index={i} />
      ))}
    </div>
  );
}
