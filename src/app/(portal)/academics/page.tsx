import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { canManageAcademics, canViewAcademics } from '@/lib/permissions';
import { db } from '@/lib/db';
import { sectionScope } from '@/lib/queries';
import { days, timeLabel, displayDate } from '@/lib/utils';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Modal } from '@/components/modal';
import {
  CourseForm,
  DepartmentForm,
  RoomForm,
  SectionForm,
  TermForm,
} from '@/components/academic-forms';
export const metadata = { title: 'Academics' };
export default async function AcademicsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  if (!canViewAcademics(user.role)) redirect('/dashboard');
  const manager = canManageAcademics(user.role);
  const p = await searchParams;
  const view =
    manager && ['courses', 'departments', 'terms', 'rooms'].includes(p.view ?? '')
      ? p.view
      : 'classes';
  const [sections, departments, courses, lecturers, terms, rooms] = await Promise.all([
    db.courseSection.findMany({
      where: sectionScope(user),
      include: {
        course: { include: { department: true } },
        lecturer: true,
        classroom: true,
        semester: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { code: 'asc' },
    }),
    manager
      ? db.department.findMany({
          orderBy: { name: 'asc' },
          include: { _count: { select: { students: true, courses: true } } },
        })
      : Promise.resolve([]),
    manager
      ? db.course.findMany({ include: { department: true }, orderBy: { code: 'asc' } })
      : Promise.resolve([]),
    manager ? db.lecturer.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
    manager
      ? db.semester.findMany({ include: { academicYear: true }, orderBy: { startsAt: 'desc' } })
      : Promise.resolve([]),
    manager ? db.classroom.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONNECTED LEARNING</div>
          <h1>{manager ? 'Academics' : 'My classes'}</h1>
          <p>
            {manager
              ? 'Build the structure that helps learning flourish.'
              : 'Your courses, people and weekly class schedule.'}
          </p>
        </div>
        {manager && (
          <Modal
            wide
            title={
              view === 'courses'
                ? 'Create course'
                : view === 'departments'
                  ? 'Create department'
                  : view === 'terms'
                    ? 'Create academic term'
                    : view === 'rooms'
                      ? 'Create classroom'
                      : 'Create class section'
            }
            trigger={
              <>
                <Plus size={14} />
                {view === 'courses'
                  ? 'Add course'
                  : view === 'departments'
                    ? 'Add department'
                    : view === 'terms'
                      ? 'Add term'
                      : view === 'rooms'
                        ? 'Add classroom'
                        : 'Add class section'}
              </>
            }
          >
            {view === 'courses' ? (
              <CourseForm departments={departments} />
            ) : view === 'departments' ? (
              <DepartmentForm />
            ) : view === 'terms' ? (
              <TermForm />
            ) : view === 'rooms' ? (
              <RoomForm />
            ) : (
              <SectionForm
                courses={courses}
                lecturers={lecturers}
                terms={terms.map((t) => ({ id: t.id, name: `${t.academicYear.name} · ${t.name}` }))}
                rooms={rooms}
              />
            )}
          </Modal>
        )}
      </div>
      {manager && (
        <nav className="tabs" aria-label="Academic categories">
          {[
            { key: 'classes', title: 'Class sections' },
            { key: 'courses', title: 'Course catalog' },
            { key: 'departments', title: 'Departments' },
            { key: 'terms', title: 'Academic terms' },
            { key: 'rooms', title: 'Classrooms' },
          ].map((tab) => (
            <Link
              key={tab.key}
              className={`tab ${view === tab.key ? 'tab-active' : ''}`}
              href={`/academics?view=${tab.key}`}
            >
              {tab.title}
            </Link>
          ))}
        </nav>
      )}
      {view === 'classes' &&
        (sections.length ? (
          <div className="three-columns">
            {sections.map((s) => (
              <Card className="section-tile" key={s.id}>
                <div className="flex justify-between items-start">
                  <span className="course-code">{s.code}</span>
                  <Badge tone="purple">{s.course.credits} credits</Badge>
                </div>
                <h2>{s.course.name}</h2>
                <p>
                  {s.lecturer.name}
                  <br />
                  {s.course.department.name}
                </p>
                <div className="rounded-lg p-3 mt-5" style={{ background: 'var(--soft)' }}>
                  <p style={{ margin: 0, fontSize: 11 }}>
                    {days[s.dayOfWeek]} · {timeLabel(s.startMinute)}–{timeLabel(s.endMinute)}
                    <br />
                    {s.classroom.name} · {s.semester.name}
                  </p>
                </div>
                <footer>
                  <span className="muted">
                    {s._count.enrollments} / {s.capacity} enrolled
                  </span>
                  <Link
                    className="card-link"
                    href={user.role === 'STUDENT' ? '/attendance' : `/attendance?section=${s.id}`}
                  >
                    {user.role === 'STUDENT' ? 'My attendance' : 'Take attendance'} →
                  </Link>
                </footer>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="Learning starts with a class"
              description={
                manager
                  ? 'Create a department, course, lecturer, term and classroom, then add your first class section.'
                  : 'Your assigned or enrolled classes will appear here.'
              }
            />
          </Card>
        ))}
      {view === 'courses' && (
        <Card>
          {courses.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course</th>
                    <th>Department</th>
                    <th>Credits</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold">{c.code}</td>
                      <td>{c.name}</td>
                      <td className="muted">{c.department.name}</td>
                      <td>{c.credits}</td>
                      <td>
                        <Modal title="Edit course" trigger="Edit">
                          <CourseForm departments={departments} course={c} />
                        </Modal>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Your curriculum starts here"
              description="Create courses in your department catalog."
            />
          )}
        </Card>
      )}
      {view === 'departments' && (
        <div className="three-columns">
          {departments.map((d) => (
            <Card key={d.id} className="section-tile">
              <span className="course-code">{d.code}</span>
              <h2>{d.name}</h2>
              <p>
                {d._count.students} students · {d._count.courses} courses
              </p>
              <footer>
                <span className="muted">Academic department</span>
                <Modal title="Edit department" trigger="Edit">
                  <DepartmentForm department={d} />
                </Modal>
              </footer>
            </Card>
          ))}
          {!departments.length && (
            <EmptyState
              title="Create your first department"
              description="Departments organize your students, lecturers and courses."
            />
          )}
        </div>
      )}
      {view === 'terms' && (
        <Card>
          {terms.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Academic year</th>
                    <th>Term</th>
                    <th>Starts</th>
                    <th>Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t) => (
                    <tr key={t.id}>
                      <td>{t.academicYear.name}</td>
                      <td>{t.name}</td>
                      <td>{displayDate(t.startsAt)}</td>
                      <td>{displayDate(t.endsAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Set your academic calendar"
              description="Create a term before scheduling your first class."
            />
          )}
        </Card>
      )}
      {view === 'rooms' && (
        <div className="three-columns">
          {rooms.map((r) => (
            <Card key={r.id} className="section-tile">
              <h2>{r.name}</h2>
              <p>Capacity: {r.capacity} students</p>
            </Card>
          ))}
          {!rooms.length && (
            <EmptyState
              title="A place to learn"
              description="Create classrooms to schedule class sections."
            />
          )}
        </div>
      )}
      <p className="muted text-[10px] mt-6">
        Class schedules use Asia/Phnom_Penh · Sections and historical academic records are retained.
        Advanced timetable editing is planned for a later phase.
      </p>
    </>
  );
}
