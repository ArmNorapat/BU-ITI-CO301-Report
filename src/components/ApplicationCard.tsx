import type { PublicApplication } from '@/lib/types';

import { AdvisorStatus } from './AdvisorStatus';
import { DocumentList } from './DocumentList';

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '-') return null;
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-base whitespace-pre-line text-slate-800 dark:text-slate-200">
        {value}
      </dd>
    </div>
  );
}

export function ApplicationCard({ app }: { app: PublicApplication }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <header className="min-w-0">
        <h3 className="text-xl font-semibold break-words">
          {app.company || 'ยังไม่ระบุสถานประกอบการ'}
        </h3>
        {app.position ? (
          <p className="mt-0.5 text-base text-slate-600 dark:text-slate-400">{app.position}</p>
        ) : null}
      </header>

      <AdvisorStatus text={app.statusText} />

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
