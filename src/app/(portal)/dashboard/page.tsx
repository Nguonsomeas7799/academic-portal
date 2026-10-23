import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCheck,
  GraduationCap,
  Megaphone,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getDashboard } from '@/lib/queries';
import { canManageAcademics, canViewAcademics } from '@/lib/permissions';
import { dictionary } from '@/lib/i18n';
import { days, displayDate, initials, timeLabel } from '@/lib/utils';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttendanceChart, DepartmentChart } from '@/components/dashboard-charts';
import { Modal } from '@/components/modal';
import { ActionForm, Field } from '@/components/action-form';
import { Input, Textarea } from '@/components/ui/input';
import { postAnnouncementAction } from '@/app/actions/academic';

export const metadata = { title: 'Overview' };
export default async function DashboardPage() {
  const user = await requireUser();
  const d = await getDashboard(user);
  const manager = canManageAcademics(user.role),
    academic = canViewAcademics(user.role);
  const t = dictionary[(await cookies()).get('locale')?.value === 'km' ? 'km' : 'en'];
  const metrics = [
    {
      label: manager
        ? 'Active students'
        : user.role === 'STUDENT'
          ? 'My student record'
          : 'Students in your classes',
      value: d.students,
      icon: Users,
      color: '#8873d3',
      bg: '#f0ebfb',
      note: 'Currently active',
      detail: 'student records',
    },
    {
      label: 'Class sections',
      value: d.sections.length,
      icon: BookOpen,
      color: '#639f8d',
      bg: '#eaf5f0',
      note: 'Connected learning',
      detail: 'scheduled sections',
    },
    {
      label: 'Enrollments',
      value: d.enrollmentCount,
      icon: GraduationCap,
      color: '#c49a5c',
      bg: '#fbf2e5',
      note: 'Learning in motion',
      detail: 'class registrations',
    },
    {
      label: 'Attendance rate',
      value: d.attendanceRate === null ? '—' : `${d.attendanceRate}%`,
      icon: CheckCheck,
      color: '#6b9bcc',
      bg: '#eaf1fa',
      note: 'Present + late',
      detail: 'of all recorded sessions',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CAMPUS AT A GLANCE</div>
          <h1>{t.dashboard}</h1>
          <p>A thoughtful view of what’s happening across your campus.</p>
        </div>
        <div className="heading-actions">
          <span className="date-chip">
            <CalendarDays size={14} />
            {displayDate(new Date())}
          </span>
          {academic && (
            <Button asChild variant="outline">
              <a href="/api/export?type=attendance">
                <ArrowDownToLine size={14} />
                Export report
              </a>
            </Button>
          )}
          {manager && (
            <Button asChild>
              <Link href="/students/new">
                <Plus size={15} />
                {t.addStudent}
              </Link>
            </Button>
          )}
        </div>
      </div>
      <section className="welcome-banner">
        <div>
          <div className="eyebrow" style={{ color: '#9381bf', marginBottom: 9 }}>
            A GOOD DAY TO MAKE A DIFFERENCE
          </div>
          <h2>
            Welcome back, {user.name.split(' ')[0]} <span aria-hidden="true">☀</span>
          </h2>
          <p>
            {t.welcome} Here’s your space to see the big picture and focus on what matters today.
          </p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <GraduationCap size={87} strokeWidth={1.1} />
        </div>
      </section>
      {academic && (
        <>
          <div className="metrics-grid">
            {metrics.map(({ label, value, icon: Icon, color, bg, note, detail }) => (
              <Card key={label} className="metric">
                <div className="metric-top">
                  <span>{label}</span>
                  <span className="metric-icon" style={{ color, background: bg }}>
                    <Icon size={17} />
                  </span>
                </div>
                <div className="metric-value">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div className="metric-footer">
                  <strong>{note}</strong>
                  <span>· {detail}</span>
                </div>
              </Card>
            ))}
          </div>
          <div className="dashboard-row">
            <Card>
              <div className="card-header">
                <div>
                  <h2>Attendance overview</h2>
                  <p>A little consistency goes a long way.</p>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot" style={{ background: '#9581da' }} />
                    Present / late
                  </span>
                  <span>
                    <i className="legend-dot" style={{ background: '#ddd5f4' }} />
                    Absent
                  </span>
                </div>
              </div>
              <AttendanceChart data={d.chart} />
              <div className="px-6 pb-4 text-[9px] muted">
                Last 7 days · recorded attendance counts; excused shown separately
              </div>
            </Card>
            <Card>
              <div className="card-header">
                <div>
                  <h2>Students by department</h2>
                  <p>{manager ? 'Different paths. One community.' : 'Your academic community.'}</p>
                </div>
                <Users size={16} className="muted" />
              </div>
              <DepartmentChart
                data={d.departments.map((x) => ({ name: x.name, value: x._count.students }))}
              />
            </Card>
          </div>
        </>
      )}
      {!academic && (
        <Card className="section-gap">
          <div className="card-body">
            <h2>Your campus workspace</h2>
            <p className="muted mt-3 text-sm leading-7">
              Your accountant account can access campus announcements and account security. Billing
              and payment workflows are planned for the finance phase.
            </p>
          </div>
        </Card>
      )}
      <div className="dashboard-bottom">
        <div className="stack">
          {manager ? (
            <Card>
              <div className="card-header">
                <div>
                  <h2>Recently registered students</h2>
                  <p>New faces, fresh possibilities.</p>
                </div>
                <Link href="/students" className="card-link">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              {d.recent.length ? (
                <div className="table-scroll mt-5">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Department</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.recent.map((s, i) => (
                        <tr key={s.id}>
                          <td>
                            <Link className="table-person" href={`/students/${s.id}`}>
                              <span
                                className={`avatar ${i % 2 ? 'avatar-green' : 'avatar-purple'}`}
                              >
                                {initials(`${s.firstName} ${s.lastName}`)}
                              </span>
                              <span>
                                <strong>
                                  {s.firstName} {s.lastName}
                                </strong>
                                <small>{s.studentNumber}</small>
                              </span>
                            </Link>
                          </td>
                          <td className="muted">{s.department.name}</td>
                          <td>
                            <Badge tone={s.status === 'ACTIVE' ? 'green' : 'neutral'}>
                              {s.status.replace('_', ' ').toLowerCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="A new chapter starts here"
                  description="Register your first student to bring your campus workspace to life."
                />
              )}
            </Card>
          ) : academic ? (
            <Card>
              <div className="card-header">
                <div>
                  <h2>Your classes</h2>
                  <p>Your week, a little more organized.</p>
                </div>
                <Link className="card-link" href="/academics">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <div className="mini-list">
                {d.sections.slice(0, 4).map((s) => (
                  <div className="mini-list-item" key={s.id}>
                    <span className="mini-list-icon">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <h3>{s.course.name}</h3>
                      <p>
                        {days[s.dayOfWeek]} · {timeLabel(s.startMinute)}–{timeLabel(s.endMinute)} ·{' '}
                        {s.classroom.name}
                      </p>
                    </div>
                    <Badge tone="purple">{s.code}</Badge>
                  </div>
                ))}
              </div>
              {!d.sections.length && (
                <EmptyState
                  title="No classes yet"
                  description="Your enrolled or assigned classes will appear here."
                />
              )}
            </Card>
          ) : null}
          {manager && (
            <Card>
              <div className="card-header">
                <div>
                  <h2>Campus activity</h2>
                  <p>The small steps moving your campus forward.</p>
                </div>
                <Sparkles size={16} className="muted" />
              </div>
              <div className="mini-list">
                {d.activity.map((a) => (
                  <div className="mini-list-item" key={a.id}>
                    <span className="mini-list-icon">
                      <CheckCheck size={16} />
                    </span>
                    <div>
                      <h3>
                        {a.action.replaceAll('_', ' ').toLowerCase()} · {a.entity}
                      </h3>
                      <p>
                        {a.actor?.name ?? 'System'} · {displayDate(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {!d.activity.length && (
                <EmptyState
                  title="A clean slate"
                  description="Academic activity appears as your team updates records."
                />
              )}
            </Card>
          )}
        </div>
        <Card>
          <div className="card-header">
            <div>
              <h2>Campus noticeboard</h2>
              <p>Good to know. Easy to stay connected.</p>
            </div>
            <Megaphone size={17} className="muted" />
          </div>
          <div className="notice-list">
            {d.announcements.map((n) => (
              <article className="notice" key={n.id}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <small>
                  {displayDate(n.createdAt)} · {n.author.name}
                </small>
              </article>
            ))}
          </div>
          {!d.announcements.length && (
            <EmptyState
              title="You’re all caught up"
              description="Campus announcements will appear here when published."
            />
          )}
          {manager && (
            <div className="px-6 pb-5">
              <Modal
                trigger={
                  <>
                    <Plus size={13} />
                    Post announcement
                  </>
                }
                title="Share with your campus"
                description="This announcement will be visible to every signed-in user."
              >
                <ActionForm action={postAnnouncementAction} label="Publish announcement">
                  <Field label="Title">
                    <Input name="title" required maxLength={120} />
                  </Field>
                  <Field label="Message">
                    <Textarea name="body" required minLength={5} maxLength={2000} />
                  </Field>
                </ActionForm>
              </Modal>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
