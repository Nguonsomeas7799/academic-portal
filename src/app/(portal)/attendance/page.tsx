import { redirect, notFound } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { canViewAcademics } from '@/lib/permissions';
import { db } from '@/lib/db';
import { sectionScope } from '@/lib/queries';
import { displayDate } from '@/lib/utils';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/action-form';
import { AttendanceRoster } from '@/components/attendance-roster';
export const metadata = { title: 'Attendance' };
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>;
}) {
  const user = await requireUser();
  if (!canViewAcademics(user.role)) redirect('/dashboard');
  if (user.role === 'STUDENT') {
    const records = await db.attendanceRecord.findMany({
      where: { studentId: user.student?.id ?? '__none__' },
      orderBy: { session: { date: 'desc' } },
      take: 100,
      include: { session: { include: { section: { include: { course: true } } } } },
    });
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">SHOWING UP MATTERS</div>
            <h1>My attendance</h1>
            <p>Your latest 100 attendance records. Export for your full history.</p>
          </div>
          <Button asChild variant="outline">
            <a href="/api/export?type=attendance">Export my attendance</a>
          </Button>
        </div>
        <Card>
          {records.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{displayDate(r.session.date)}</td>
                      <td>{r.session.section.course.name}</td>
                      <td>{r.session.section.code}</td>
                      <td>
                        <Badge
                          tone={
                            r.status === 'ABSENT'
                              ? 'red'
                              : r.status === 'PRESENT'
                                ? 'green'
                                : 'amber'
                          }
                        >
                          {r.status.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No attendance records yet"
              description="Your lecturer will record attendance when your classes begin."
            />
          )}
        </Card>
      </>
    );
  }
  const p = await searchParams;
  const date = z.iso.date().safeParse(p.date).success
    ? p.date!
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  const sections = await db.courseSection.findMany({
    where: sectionScope(user),
    include: { course: true },
    orderBy: { code: 'asc' },
  });
  const selected = sections.find((s) => s.id === p.section);
  if (p.section && !selected) notFound();
  const section = selected
    ? await db.courseSection.findUnique({
        where: { id: selected.id },
        include: {
          enrollments: { include: { student: true }, orderBy: { student: { lastName: 'asc' } } },
          attendanceSessions: { where: { date: new Date(date) }, include: { records: true } },
        },
      })
    : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY DAY COUNTS</div>
          <h1>Attendance</h1>
          <p>A simple check-in. A stronger learning community.</p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/export?type=attendance">Export attendance</a>
        </Button>
      </div>
      <Card className="section-gap">
        <form action="/attendance" className="card-body attendance-controls">
          <Field label="Class section">
            <Select name="section" required defaultValue={selected?.id ?? ''}>
              <option value="">Choose a class</option>
              {sections.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.code} · {s.course.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Session date">
            <Input type="date" name="date" required defaultValue={date} />
          </Field>
          <Button type="submit">Load class roster</Button>
        </form>
      </Card>
      <Card>
        {section && section.enrollments.length ? (
          <>
            <div className="card-header pb-2">
              <div>
                <h2>{selected?.course.name}</h2>
                <p>
                  {selected?.code} · {displayDate(date)} ·{' '}
                  {section.attendanceSessions.length
                    ? 'Previously saved — editing is audited'
                    : 'New attendance session'}
                </p>
              </div>
              <Badge tone="purple">{section.enrollments.length} students</Badge>
            </div>
            <AttendanceRoster
              key={`${section.id}-${date}`}
              sectionId={section.id}
              date={date}
              students={section.enrollments.map((e) => ({
                id: e.student.id,
                name: `${e.student.firstName} ${e.student.lastName}`,
                number: e.student.studentNumber,
                status:
                  section.attendanceSessions[0]?.records.find((r) => r.studentId === e.studentId)
                    ?.status ?? '',
              }))}
            />
          </>
        ) : (
          <EmptyState
            title={section ? 'No students enrolled yet' : 'Let’s check in'}
            description={
              section
                ? 'Enroll students in this class before recording attendance.'
                : 'Choose a class section and session date to load its attendance roster.'
            }
          />
        )}
      </Card>
    </>
  );
}
