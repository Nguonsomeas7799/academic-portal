import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { canManageAcademics, canViewAcademics } from '@/lib/permissions';
import { db } from '@/lib/db';
import { sectionScope, studentScope } from '@/lib/queries';
import { Card, EmptyState } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (!canViewAcademics(user.role)) redirect('/dashboard');
  const p = await searchParams;
  const q = typeof p.q === 'string' ? p.q.trim().slice(0, 100) : '';
  const students =
    q && (canManageAcademics(user.role) || user.role === 'STUDENT')
      ? await db.student.findMany({
          where: {
            AND: [
              studentScope(user),
              {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { studentNumber: { contains: q, mode: 'insensitive' } },
                ],
              },
            ],
          },
          take: 20,
          include: { department: true },
        })
      : [];
  const sections = q
    ? await db.courseSection.findMany({
        where: {
          AND: [
            sectionScope(user),
            {
              OR: [
                { code: { contains: q, mode: 'insensitive' } },
                { course: { name: { contains: q, mode: 'insensitive' } } },
              ],
            },
          ],
        },
        include: { course: true },
        take: 20,
      })
    : [];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FIND YOUR NEXT STEP</div>
          <h1>Search your workspace</h1>
          <p>Search returns only records your account can access. Up to 20 matches per category.</p>
        </div>
      </div>
      <Card className="section-gap">
        <form className="section-toolbar" action="/search">
          <Input
            name="q"
            aria-label="Search workspace"
            defaultValue={q}
            placeholder="Student name, ID, course or class code…"
            required
            maxLength={100}
          />
          <Button type="submit">Search</Button>
        </form>
      </Card>
      <div className="two-columns">
        <Card>
          <div className="card-header">
            <h2>Students</h2>
          </div>
          <div className="mini-list">
            {students.map((s) => (
              <Link className="mini-list-item" href={`/students/${s.id}`} key={s.id}>
                <div>
                  <h3>
                    {s.firstName} {s.lastName}
                  </h3>
                  <p>
                    {s.studentNumber} · {s.department.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {!students.length && (
            <EmptyState
              title="No student matches"
              description={
                q ? 'Try another name or student ID.' : 'Enter a search above to get started.'
              }
            />
          )}
        </Card>
        <Card>
          <div className="card-header">
            <h2>Class sections</h2>
          </div>
          <div className="mini-list">
            {sections.map((s) => (
              <Link className="mini-list-item" href="/academics" key={s.id}>
                <div>
                  <h3>{s.course.name}</h3>
                  <p>{s.code}</p>
                </div>
              </Link>
            ))}
          </div>
          {!sections.length && (
            <EmptyState
              title="No class matches"
              description={
                q
                  ? 'Try another class code or course title.'
                  : 'Search for a course or class section.'
              }
            />
          )}
        </Card>
      </div>
    </>
  );
}
