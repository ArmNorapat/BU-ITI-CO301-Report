import { stageTone } from '@/lib/stages';
import type { PublicApplication } from '@/lib/types';

import { StageTimeline } from './StageTimeline';
import { StatusLog } from './StatusLog';

/** ป้ายบอกว่าเอกสารชิ้นนั้นส่งครบหรือยัง */
function DocChip({ label, ok, href }: { label: string; ok: boolean; href?: string }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset';
  const tone = ok
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30'
    : 'bg-neutral-100 text-neutral-500 ring-neutral-500/20 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-600/40';

  const content = (
    <>
      <span aria-hidden>{ok ? '✓' : '—'}</span>
      {label}
    </>
  );

  if (ok && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${tone} underline-offset-2 transition hover:underline`}
      >
        {content}
      </a>
    );
  }
  return <span className={`${base} ${tone}`}>{content}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '-') return null;
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line text-neutral-800 dark:text-neutral-200">
        {value}
      </dd>
    </div>
  );
}

export function ApplicationCard({ app, index }: { app: PublicApplication; index: number }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            ใบสมัครที่ {index + 1}
          </p>
          <h3 className="mt-1 text-lg font-semibold break-words">
            {app.company || 'ยังไม่ระบุสถานประกอบการ'}
          </h3>
          {app.position ? (
            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{app.position}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${stageTone(app.stageKey)}`}
        >
          {app.stageLabel}
        </span>
      </header>

      <div className="mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800">
        <StageTimeline currentStep={app.stageStep} stageKey={app.stageKey} />
      </div>

      {app.stageKey === 'rejected' ? (
        <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
          ผลการพิจารณาครั้งนี้ยังไม่ผ่าน กรุณาติดต่ออาจารย์ที่ปรึกษาเพื่อเลือกสถานประกอบการใหม่
        </p>
      ) : null}

      {app.statusText ? <StatusLog text={app.statusText} /> : null}

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="คำขอลงทะเบียนสหกิจ" value={app.registrationRequest} />
        <Field label="สถานะอนุมัติการลงทะเบียน CS390/IT390" value={app.registrationStatus} />
        <Field label="สถานะการส่งจดหมายส่งตัวให้บริษัท" value={app.letterStatus} />
        {app.gpa ? <Field label="GPA" value={app.gpa} /> : null}
        {app.phone ? <Field label="เบอร์โทรศัพท์ที่ให้ไว้" value={app.phone} /> : null}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-neutral-100 pt-5 dark:border-neutral-800">
        <DocChip label="Web Portfolio" ok={app.hasPortfolio} href={app.portfolioUrl} />
        <DocChip label="Resume / Transcript" ok={app.hasDocuments} href={app.documentsUrl} />
        <DocChip label="LinkedIn" ok={app.hasLinkedin} href={app.linkedinUrl} />
      </div>
    </article>
  );
}
