import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from './db';
import type { CurrentUser } from './auth';
import { canManageAcademics } from './permissions';

export function sectionScope(user: CurrentUser): Prisma.CourseSectionWhereInput {
  if (canManageAcademics(user.role)) return {};
  if (user.role === 'LECTURER') return { lecturerId: user.lecturer?.id ?? '__none__' };
  if (user.role === 'STUDENT')
    return { enrollments: { some: { studentId: user.student?.id ?? '__none__' } } };
  return { id: '__none__' };
}
export function studentScope(user: CurrentUser): Prisma.StudentWhereInput {
  if (canManageAcademics(user.role)) return {};
  if (user.role === 'LECTURER') return { enrollments: { some: { section: sectionScope(user) } } };
  if (user.role === 'STUDENT') return { id: user.student?.id ?? '__none__' };
  return { id: '__none__' };
}
export function attendanceScope(user: CurrentUser): Prisma.AttendanceRecordWhereInput {
  return user.role === 'STUDENT'
    ? { studentId: user.student?.id ?? '__none__' }
    : { session: { section: sectionScope(user) } };
}
export async function getDashboard(user: CurrentUser) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6);
  since.setUTCHours(0, 0, 0, 0);
  const [
    students,
    sections,
    enrollmentCount,
    attendance,
    recentAttendance,
    announcements,
    recent,
    departments,
    activity,
  ] = await Promise.all([
    db.student.count({ where: { AND: [studentScope(user), { status: 'ACTIVE' }] } }),
    db.courseSection.findMany({
      where: sectionScope(user),
      include: {
        course: true,
        lecturer: true,
        classroom: true,
        semester: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    }),
    db.enrollment.count({
      where:
        user.role === 'STUDENT'
          ? { studentId: user.student?.id ?? '__none__' }
          : { section: sectionScope(user) },
    }),
    db.attendanceRecord.groupBy({ by: ['status'], where: attendanceScope(user), _count: true }),
    db.attendanceRecord.findMany({
      where: { AND: [attendanceScope(user), { session: { date: { gte: since } } }] },
      select: { status: true, session: { select: { date: true } } },
    }),
    db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: { author: { select: { name: true } } },
    }),
    db.student.findMany({
      where: studentScope(user),
      take: 5,
      orderBy: { joinedAt: 'desc' },
      include: { department: true },
    }),
    db.department.findMany({
      where: { students: { some: studentScope(user) } },
      select: { name: true, _count: { select: { students: { where: studentScope(user) } } } },
    }),
    canManageAcademics(user.role)
      ? db.auditLog.findMany({
          where: { action: { not: 'SIGN_IN' } },
          take: 4,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);
  const total = attendance.reduce((sum, item) => sum + item._count, 0);
  const present = attendance
    .filter((a) => a.status === 'PRESENT' || a.status === 'LATE')
    .reduce((sum, item) => sum + item._count, 0);
  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + index);
    const records = recentAttendance.filter(
      (a) => a.session.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10),
    );
    return {
      name: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(date),
      present: records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      excused: records.filter((r) => r.status === 'EXCUSED').length,
    };
  });
  return {
    students,
    sections,
    enrollmentCount,
    attendance,
    attendanceRate: total ? Math.round((present / total) * 100) : null,
    announcements,
    recent,
    departments,
    activity,
    chart,
  };
}
