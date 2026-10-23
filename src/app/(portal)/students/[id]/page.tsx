import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { canManageAcademics, mayAccessStudent } from '@/lib/permissions';
import { db } from '@/lib/db';
import { days, displayDate, initials, timeLabel } from '@/lib/utils';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/modal';
import { ActionForm, Field } from '@/components/action-form';
import { Select } from '@/components/ui/input';
import { archiveStudentAction, enrollAction, withdrawAction } from '@/app/actions/academic';
export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!mayAccessStudent(user.role, user.student?.id, id)) notFound();
  const student = await db.student.findUnique({
    where: { id },
    include: {
      department: true,
      program: true,
      enrollments: {
        include: {
          section: { include: { course: true, lecturer: true, classroom: true, semester: true } },
        },
      },
      attendance: {
        include: { session: { include: { section: { include: { course: true } } } } },
        orderBy: { session: { date: 'desc' } },
        take: 30,
      },
    },
  });
  if (!student) notFound();
  const manager = canManageAcademics(user.role);
  const sections = manager
    ? await db.courseSection.findMany({
        where: { enrollments: { none: { studentId: id } } },
        include: { course: true, semester: true },
      })
    : [];
  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="card-link mb-3" href={manager ? '/students' : '/dashboard'}>
            <ArrowLeft size={13} />
            {manager ? 'All students' : 'Overview'}
          </Link>
          <h1>Student record</h1>
          <p>A clear picture of an academic journey.</p>
        </div>
        {manager && (
          <div className="heading-actions">
            {student.status !== 'ARCHIVED' && (
              <Modal
                title="Archive student"
                description="Academic records are retained. The linked portal account will be disabled."
                trigger="Archive"
              >
                <ActionForm
                  action={archiveStudentAction}
                  label="Archive student"
                  variant="destructive"
                  confirm="Archive this student and disable their portal access?"
                >
                  <input type="hidden" name="id" value={id} />
                </ActionForm>
              </Modal>
            )}
            <Button asChild>
              <Link href={`/students/${id}/edit`}>
                <Pencil size={14} />
                Edit record
              </Link>
            </Button>
          </div>
        )}
      </div>
      <div className="two-columns section-gap">
        <Card>
          <div className="detail-header">
            <span className="avatar avatar-purple detail-avatar">
              {initials(`${student.firstName} ${student.lastName}`)}
            </span>
            <div>
              <h2>
                {student.firstName} {student.lastName}
              </h2>
              <p className="muted text-xs mt-2">{student.studentNumber}</p>
            </div>
            <span className="ml-auto">
              <Badge tone={student.status === 'ACTIVE' ? 'green' : 'neutral'}>
                {student.status.replace('_', ' ').toLowerCase()}
              </Badge>
            </span>
          </div>
          <dl className="detail-grid">
            {[
              ['Email', student.email],
              ['Phone', student.phone || 'Not provided'],
              ['Department', student.department.name],
              ['Program', student.program?.name ?? 'Not assigned'],
              ['Joined', displayDate(student.joinedAt)],
              ['Emergency contact', student.emergencyContact || 'Not provided'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <div className="card-body">
            <div className="eyebrow">ACADEMIC SNAPSHOT</div>
            <h2>Room to grow. Space to succeed.</h2>
            <div className="flex gap-12 my-7">
              <div>
                <strong className="text-3xl">{student.enrollments.length}</strong>
                <p className="muted text-xs mt-2">Enrolled classes</p>
              </div>
              <div>
                <strong className="text-3xl">
                  {student.enrollments.reduce((sum, e) => sum + e.section.course.credits, 0)}
                </strong>
                <p className="muted text-xs mt-2">Enrolled credits</p>
              </div>
            </div>
            <p className="muted text-xs leading-6">
              Attendance history is available below. Grades, transcripts, submissions and billing
              are planned in later phases.
            </p>
          </div>
        </Card>
      </div>
      <Card className="section-gap">
        <div className="card-header pb-5">
          <h2>Course enrollments</h2>
          {manager && student.status === 'ACTIVE' && (
            <Modal
              title="Enroll in a class"
              trigger={
                <>
                  <Plus size={13} />
                  Add enrollment
                </>
              }
            >
              <ActionForm action={enrollAction} label="Enroll student">
                <input type="hidden" name="studentId" value={id} />
                <Field label="Class section">
                  <Select name="sectionId" required>
                    <option value="">Choose a section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} · {s.course.name} · {s.semester.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="muted text-xs leading-6">
                  Capacity and timetable conflicts are checked before enrollment is saved.
                </p>
              </ActionForm>
            </Modal>
          )}
        </div>
        {student.enrollments.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Course / section</th>
                  <th>Lecturer</th>
                  <th>Schedule</th>
                  <th>Credits</th>
                  {manager && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {student.enrollments.map(({ id: enrollmentId, section: s }) => (
                  <tr key={enrollmentId}>
                    <td>
                      <strong>{s.course.name}</strong>
                      <small className="block muted mt-1">
                        {s.code} · {s.semester.name}
                      </small>
                    </td>
                    <td>{s.lecturer.name}</td>
                    <td>
                      {days[s.dayOfWeek]} {timeLabel(s.startMinute)}–{timeLabel(s.endMinute)}
                      <small className="block muted mt-1">{s.classroom.name}</small>
                    </td>
                    <td>{s.course.credits}</td>
                    {manager && (
                      <td>
                        <ActionForm
                          className="flex flex-col gap-2"
                          action={withdrawAction}
                          label="Withdraw"
                          reset={false}
                          variant="outline"
                          confirm="Remove this enrollment? Enrollments with attendance history will be retained."
                        >
                          <input type="hidden" name="id" value={enrollmentId} />
                        </ActionForm>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="The next lesson is ahead"
            description="No class enrollments yet. A registrar can enroll this student in an available section."
          />
        )}
      </Card>
      <Card>
        <div className="card-header pb-5">
          <h2>Recent attendance</h2>
          <span className="muted text-xs">Latest 30 records</span>
        </div>
        {student.attendance.length ? (
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
                {student.attendance.map((r) => (
                  <tr key={r.id}>
                    <td>{displayDate(r.session.date)}</td>
                    <td>{r.session.section.course.name}</td>
                    <td>{r.session.section.code}</td>
                    <td>
                      <Badge
                        tone={
                          r.status === 'PRESENT' ? 'green' : r.status === 'ABSENT' ? 'red' : 'amber'
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
            title="No attendance recorded"
            description="Class attendance will appear here after it is recorded."
          />
        )}
      </Card>
    </>
  );
}
