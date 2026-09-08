import { TIMELINE_STEPS } from '@/lib/stages';
import type { StageKey } from '@/lib/types';

type Props = {
  currentStep: number;
  stageKey: StageKey;
};

/** แถบแสดงความคืบหน้า 5 ขั้น ตั้งแต่ส่งประวัติจนถึงบริษัทตอบรับ */
export function StageTimeline({ currentStep, stageKey }: Props) {
  const rejected = stageKey === 'rejected';

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-2">
      {TIMELINE_STEPS.map((step, index) => {
        const done = !rejected && currentStep >= step.step;
        const active = !rejected && currentStep === step.step;

        return (
          <li key={step.key} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
            {/* เส้นบอกลำดับ: แนวตั้งบนมือถือ แนวนอนบนจอใหญ่ */}
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                aria-hidden
                className={[
                  'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1 transition',
                  done
                    ? 'bg-emerald-500 text-white ring-emerald-500'
                    : 'bg-white text-neutral-400 ring-neutral-300 dark:bg-neutral-900 dark:ring-neutral-700',
                  active ? 'ring-2 ring-offset-2 ring-emerald-500 ring-offset-white dark:ring-offset-neutral-950' : '',
                ].join(' ')}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                aria-hidden
                className={[
                  'w-px flex-1 sm:h-px sm:w-full',
                  index === TIMELINE_STEPS.length - 1 ? 'hidden' : '',
                  done && currentStep > step.step
                    ? 'bg-emerald-500'
                    : 'bg-neutral-200 dark:bg-neutral-700',
                ].join(' ')}
              />
            </div>

            <p
              className={[
                'pb-4 text-xs leading-snug sm:pb-0',
                active
                  ? 'font-semibold text-neutral-900 dark:text-neutral-50'
                  : done
                    ? 'text-neutral-600 dark:text-neutral-300'
                    : 'text-neutral-400 dark:text-neutral-500',
              ].join(' ')}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
