import { stageDescription, stageTone } from '@/lib/stages';
import type { PublicApplication } from '@/lib/types';

import { DocumentList } from './DocumentList';
import { StatusLog } from './StatusLog';

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '-') return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line text-slate-800 dark:text-slate-200">
        {value}
      </dd>
    </div>
  );
}

export function ApplicationCard({ app, index }: { app: PublicApplication; index: number }) {
  const description = stageDescription(app.stageKey);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <header className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          ใบสมัครที่ {index + 1}
        </p>
        <h3 className="mt-1 text-lg font-semibold break-words">
          {app.company || 'ยังไม่ระบุสถานประกอบการ'}
        </h3>
        {app.position ? (
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{app.position}</p>
        ) : null}
      </header>

      {/* สถานะคือสิ่งที่นักศึกษาเข้ามาดู จึงให้เป็นบล็อกเด่นแทนการเป็นป้ายเล็ก ๆ */}
      <div
        className={`mt-5 rounded-xl px-4 py-4 ring-1 ring-inset ${stageTone(app.stageKey)}`}
      >
        <p className="text-xs font-medium opacity-80">สถานะล่าสุด</p>
        <p className="mt-1 text-xl leading-snug font-bold break-words">{app.stageLabel}</p>
        {description ? <p className="mt-2 text-sm leading-relaxed">{description}</p> : null}
      </div>

      {app.statusText ? <StatusLog text={app.statusText} /> : null}

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="คำขอลงทะเบียนสหกิจ" value={app.registrationRequest} />
        <Field label="สถานะอนุมัติการลงทะเบียน CS390/IT390" value={app.registrationStatus} />
        <Field label="สถานะการส่งจดหมายส่งตัวให้บริษัท" value={app.letterStatus} />
        {app.gpa ? <Field label="GPA" value={app.gpa} /> : null}
        {app.phone ? <Field label="เบอร์โทรศัพท์ที่ให้ไว้" value={app.phone} /> : null}
      </dl>

      <DocumentList app={app} />
    </article>
  );
}
