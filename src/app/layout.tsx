import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import Link from 'next/link';

import './globals.css';

const thai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-thai',
});

export const metadata: Metadata = {
  title: 'ตรวจผลการพิจารณาสหกิจศึกษา | BU ITI',
  description:
    'ระบบตรวจสอบผลการพิจารณาของสถานประกอบการที่นักศึกษาสมัครเข้าฝึกงานสหกิจศึกษา คณะเทคโนโลยีสารสนเทศและนวัตกรรม มหาวิทยาลัยกรุงเทพ',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={thai.variable}>
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <div className="flex min-h-dvh flex-col">
          <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
              <Link href="/" className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-500 text-sm font-bold text-white"
                >
                  BU
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">ผลการพิจารณาสหกิจศึกษา</span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                    School of Information Technology and Innovation
                  </span>
                </span>
              </Link>
              <Link
                href="/stats"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                ภาพรวม
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-12">{children}</main>

          <footer className="border-t border-neutral-200 py-6 dark:border-neutral-800">
            <p className="mx-auto max-w-4xl px-5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              ข้อมูลอ้างอิงจากไฟล์ติดตามผลของอาจารย์ที่ปรึกษาสหกิจศึกษา อาจมีความล่าช้าในการอัปเดต
              หากพบข้อมูลไม่ตรงกับความเป็นจริง กรุณาติดต่ออาจารย์ที่ปรึกษาโดยตรง
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
