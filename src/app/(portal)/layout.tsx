import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/shell';
export const dynamic = 'force-dynamic';
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = (await cookies()).get('locale')?.value === 'km' ? 'km' : 'en';
  return (
    <Shell
      user={{ name: user.name, email: user.email, role: user.role, studentId: user.student?.id }}
      locale={locale}
      initialDark={(await cookies()).get('theme')?.value === 'dark'}
    >
      {children}
    </Shell>
  );
}
