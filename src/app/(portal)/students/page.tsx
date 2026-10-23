import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma, StudentStatus } from '@prisma/client';
import { ArrowDownToLine, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageAcademics } from '@/lib/permissions';
import { dictionary } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StudentTable } from '@/components/student-table';
export const metadata = { title: 'Students' };
export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!canManageAcademics(user.role))
    redirect(user.student ? `/students/${user.student.id}` : '/dashboard');
  const p = await searchParams;
  const str = (key: string) => (typeof p[key] === 'string' ? p[key].slice(0, 100) : '');
  const q = str('q'),
    department = str('department'),
    status = str('status'),
    sort = str('sort');
  const where: Prisma.StudentWhereInput = {
    ...(q
      ? {
          OR: ['firstName', 'lastName', 'email', 'studentNumber'].map((key) => ({
            [key]: { contains: q, mode: 'insensitive' },
          })),
        }
      : {}),
    ...(department ? { departmentId: department } : {}),
    ...(Object.values(StudentStatus).includes(status as StudentStatus)
      ? { status: status as StudentStatus }
      : {}),
  };
  const orderBy: Prisma.StudentOrderByWithRelationInput = sort.startsWith('name-')
    ? { lastName: sort === 'name-desc' ? 'desc' : 'asc' }
    : sort.startsWith('department-')
      ? { department: { name: sort === 'department-desc' ? 'desc' : 'asc' } }
      : sort.startsWith('status-')
        ? { status: sort === 'status-desc' ? 'desc' : 'asc' }
        : { joinedAt: 'desc' };
  const total = await db.student.count({ where });
  const requestedPage = Number(str('page')) || 1;
  const page = Math.max(1, Math.min(Math.floor(requestedPage), Math.max(1, Math.ceil(total / 10))));
  const [students, departments] = await Promise.all([
    db.student.findMany({
      where,
      orderBy: [orderBy, { id: 'asc' }],
      skip: (page - 1) * 10,
      take: 10,
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        department: { select: { name: true } },
      },
    }),
    db.department.findMany({ orderBy: { name: 'asc' } }),
  ]);
  const locale = (await cookies()).get('locale')?.value === 'km' ? 'km' : 'en';
  const t = dictionary[locale];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PEOPLE & POSSIBILITIES</div>
          <h1>{t.students}</h1>
          <p>Every student has a story. Keep their next chapter organized.</p>
        </div>
        <div className="heading-actions">
          <Button asChild variant="outline">
            <a href="/api/export?type=students">
              <ArrowDownToLine size={14} />
              Export CSV
            </a>
          </Button>
          <Button asChild>
            <Link href="/students/new">
              <Plus size={15} />
              {t.addStudent}
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <div className="card-header pb-5">
          <h2>
            {t.allStudents} <span className="muted text-xs ml-2 font-normal">{total}</span>
          </h2>
          <span className="badge badge-purple">Academic registry</span>
        </div>
        <StudentTable
          data={students}
          total={total}
          page={page}
          pageSize={10}
          departments={departments}
          locale={locale}
        />
      </Card>
    </>
  );
}
