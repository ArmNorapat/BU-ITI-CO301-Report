import type { PublicApplication } from '@/lib/types';

/**
 * เอกสารมีได้ 3 สถานะ และต้องดูออกจากภายนอกว่าอันไหนกดได้
 *   linked   — ส่งแล้วและเปิดดูได้        (เป็นลิงก์จริง)
 *   withheld — ส่งแล้วแต่ระบบไม่เปิดลิงก์ให้ (เอกสารส่วนบุคคล)
 *   missing  — ยังไม่ได้ส่ง
 */
type DocState = 'linked' | 'withheld' | 'missing';

function IconExternal() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path d="M12 3h5v5" />
      <path d="M17 3l-7 7" />
      <path d="M15 11.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4.5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5 shrink-0" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.9a1 1 0 0 0-1.4-1.4L9 10l-1.3-1.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden
    >
      <rect x="4" y="8.5" width="12" height="8" rx="1.5" />
      <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" />
    </svg>
  );
}

function IconDash() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden
    >
      <circle cx="10" cy="10" r="7" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function DocRow({ label, state, href }: { label: string; state: DocState; href?: string }) {
  const rowBase =
    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition';

  if (state === 'linked' && href) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`เปิด ${label} ในแท็บใหม่`}
          className={`${rowBase} group border-indigo-200 bg-indigo-50/60 hover:border-indigo-400 hover:bg-indigo-100/70 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:hover:border-indigo-400/60 dark:hover:bg-indigo-500/20`}
        >
          <span className="text-indigo-600 dark:text-indigo-300">
            <IconCheck />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-indigo-900 dark:text-indigo-100">
              {label}
            </span>
            <span className="block text-sm text-indigo-700/80 dark:text-indigo-300/80">
              แตะเพื่อเปิดในแท็บใหม่
            </span>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white transition group-hover:bg-indigo-700">
            เปิดลิงก์
            <IconExternal />
          </span>
        </a>
      </li>
    );
  }

  const muted =
    'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40';

  return (
    <li>
      <div className={`${rowBase} ${muted}`}>
        <span className="text-slate-400 dark:text-slate-500">
          {state === 'withheld' ? <IconLock /> : <IconDash />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-slate-600 dark:text-slate-300">
            {label}
          </span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {state === 'withheld'
              ? 'ส่งแล้ว — ระบบไม่เปิดเผยลิงก์เอกสารส่วนบุคคล'
              : 'ยังไม่ได้ส่ง'}
          </span>
        </span>
      </div>
    </li>
  );
}

export function DocumentList({ app }: { app: PublicApplication }) {
  const state = (has: boolean, href: string): DocState =>
    !has ? 'missing' : href ? 'linked' : 'withheld';

  return (
    <section className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
      <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">
        เอกสารประกอบการสมัคร
      </h4>
      <ul className="mt-3 flex flex-col gap-2">
        <DocRow
          label="Web Portfolio"
          state={state(app.hasPortfolio, app.portfolioUrl)}
          href={app.portfolioUrl}
        />
        <DocRow
          label="Resume / Transcript"
          state={state(app.hasDocuments, app.documentsUrl ?? '')}
          href={app.documentsUrl}
        />
        <DocRow
          label="LinkedIn"
          state={state(app.hasLinkedin, app.linkedinUrl)}
          href={app.linkedinUrl}
        />
      </ul>
    </section>
  );
}
