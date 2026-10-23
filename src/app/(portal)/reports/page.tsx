import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { canViewAcademics, canManageAcademics } from '@/lib/permissions';
import { attendanceScope, sectionScope, studentScope } from '@/lib/queries';
import { db } from '@/lib/db';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintButton } from '@/components/print-button';
import { displayDate } from '@/lib/utils';
export const metadata = { title: 'Academic reports' };
export default async function ReportsPage() {
  const user = await requireUser();
  if (!canViewAcademics(user.role)) redirect('/dashboard');
  const [statuses, attendance, sections] = await Promise.all([
    db.student.groupBy({ by: ['status'], where: studentScope(user), _count: true }),
    db.attendanceRecord.groupBy({ by: ['status'], where: attendanceScope(user), _count: true }),
    db.courseSection.findMany({
      where: sectionScope(user),
      include: {
        course: true,
        lecturer: true,
        _count: { select: { enrollments: true, attendanceSessions: true } },
      },
      orderBy: { code: 'asc' },
    }),
  ]);
  const total = attendance.reduce((sum, r) => sum + r._count, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CLARITY FOR BETTER DECISIONS</div>
          <h1>Academic reports</h1>
          <p>
            Generated {displayDate(new Date())} ·{' '}
            {canManageAcademics(user.role) ? 'Campus-wide' : 'Your academic records'} · All recorded
            terms
          </p>
        </div>
        <div className="heading-actions">
          <PrintButton />
          <Button asChild variant="outline">
            <a href="/api/export?type=attendance">Attendance CSV</a>
          </Button>
          {canManageAcademics(user.role) && (
            <Button asChild>
              <a href="/api/export?type=students">Student registry CSV</a>
            </Button>
          )}
        </div>
      </div>
      <div className="two-columns section-gap">
        <Card>
          <div className="card-header">
            <h2>Student enrollment status</h2>
          </div>
          <div className="mini-list">
            {statuses.map((s) => (
              <div className="mini-list-item" key={s.status}>
                <span className="capitalize text-xs">
                  {s.status.replace('_', ' ').toLowerCase()}
                </span>
                <strong className="ml-auto">{s._count}</strong>
              </div>
            ))}
          </div>
          {!statuses.length && (
            <EmptyState
              title="No student records"
              description="Reports will populate as academic records are created."
            />
          )}
        </Card>
        <Card>
          <div className="card-header">
            <h2>Attendance distribution</h2>
            <span className="muted text-xs">{total} records</span>
          </div>
          <div className="mini-list">
            {attendance.map((a) => (
              <div className="mini-list-item" key={a.status}>
                <Badge
                  tone={a.status === 'ABSENT' ? 'red' : a.status === 'PRESENT' ? 'green' : 'amber'}
                >
                  {a.status.toLowerCase()}
                </Badge>
                <span className="ml-auto text-xs">
                  {a._count} · {total ? ((a._count / total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </div>
          {!attendance.length && (
            <EmptyState
              title="No attendance recorded"
              description="Record attendance to see your distribution."
            />
          )}
        </Card>
      </div>
      <Card>
        <div className="card-header pb-5">
          <h2>Class enrollment and teaching load</h2>
        </div>
        {sections.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Class section</th>
                  <th>Course</th>
                  <th>Lecturer</th>
                  <th>Enrollments</th>
                  <th>Capacity used</th>
                  <th>Sessions recorded</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id}>
                    <td>{s.code}</td>
                    <td>{s.course.name}</td>
                    <td>{s.lecturer.name}</td>
                    <td>
                      {s._count.enrollments} / {s.capacity}
                    </td>
                    <td>{Math.round((s._count.enrollments / s.capacity) * 100)}%</td>
                    <td>{s._count.attendanceSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No classes to report"
            description="Class sections will appear here after they are created or assigned."
          />
        )}
      </Card>
      <p className="muted text-[10px] mt-5">
        Present and late records count toward the attendance rate. Excused and absent records remain
        in the denominator. Student and lecturer exports include only records available to the
        signed-in account. Export limit: 10,000 records per file.
      </p>
    </>
  );
}
