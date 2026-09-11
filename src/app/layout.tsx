import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import Link from 'next/link';

import { SITE_TITLE } from '@/lib/site';

import './globals.css';

const thai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-thai',
});

export const metadata: Metadata = {
  title: `${SITE_TITLE} | BU ITI`,
  description:
    'ระบบตรวจสอบผลการพิจารณาของสถานประกอบการที่นักศึกษาสมัครเข้าฝึกงานสหกิจศึกษา คณะเทคโนโลยีสารสนเทศและนวัตกรรม มหาวิทยาลัยกรุงเทพ',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={thai.variable}>
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <div className="flex min-h-dvh flex-col">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mx-auto flex max-w-4xl items-center px-5 py-4">
              <Link href="/" className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-base font-bold text-white"
                >
                  BU
                </span>
                <span className="leading-tight">
                  <span className="block text-base font-semibold">ผลการพิจารณาสหกิจศึกษา</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    School of Information Technology and Innovation
                  </span>
                </span>
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">{children}</main>

          <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
            <p className="mx-auto max-w-4xl px-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              ข้อมูลอ้างอิงจากไฟล์ติดตามผลของอาจารย์ที่ปรึกษาสหกิจศึกษา อาจมีความล่าช้าในการอัปเดต
              หากพบข้อมูลไม่ตรงกับความเป็นจริง กรุณาติดต่ออาจารย์ที่ปรึกษาโดยตรง
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
