import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Toaster } from 'sonner';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Academia · Academic Portal', template: '%s · Academia' },
  description: 'A connected academic workspace for students, lecturers and administrators.',
  robots: { index: false, follow: false },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  return (
    <html
      lang={jar.get('locale')?.value === 'km' ? 'km' : 'en'}
      className={jar.get('theme')?.value === 'dark' ? 'dark' : ''}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
