import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { attendanceScope } from '@/lib/queries';
import { canManageAcademics, canViewAcademics } from '@/lib/permissions';
import { csvCell } from '@/lib/utils';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const type = new URL(request.url).searchParams.get('type');
  let rows: unknown[][];
  if (type === 'students') {
    if (!canManageAcademics(user.role))
      return Response.json({ error: 'Permission denied.' }, { status: 403 });
    if ((await db.student.count()) > 10000)
      return Response.json(
        { error: 'Export exceeds 10,000 rows. Ask an administrator for a scoped database export.' },
        { status: 413 },
      );
    const students = await db.student.findMany({
      include: { department: true },
      orderBy: { studentNumber: 'asc' },
      take: 10001,
    });
    if (students.length > 10000)
      return Response.json({ error: 'Export limit exceeded.' }, { status: 413 });
    rows = [
      ['Student ID', 'First name', 'Last name', 'Email', 'Department', 'Status'],
      ...students.map((s) => [
        s.studentNumber,
        s.firstName,
        s.lastName,
        s.email,
        s.department.name,
        s.status,
      ]),
    ];
  } else if (type === 'attendance') {
    if (!canViewAcademics(user.role))
      return Response.json({ error: 'Permission denied.' }, { status: 403 });
    const where = attendanceScope(user);
    if ((await db.attendanceRecord.count({ where })) > 10000)
      return Response.json(
        { error: 'Export exceeds 10,000 rows. Ask an administrator for a scoped database export.' },
        { status: 413 },
      );
    const records = await db.attendanceRecord.findMany({
      where,
      orderBy: { session: { date: 'desc' } },
      take: 10001,
      include: { student: true, session: { include: { section: { include: { course: true } } } } },
    });
    if (records.length > 10000)
      return Response.json({ error: 'Export limit exceeded.' }, { status: 413 });
    rows = [
      ['Date', 'Student ID', 'Student', 'Course', 'Section', 'Status'],
      ...records.map((r) => [
        r.session.date.toISOString().slice(0, 10),
        r.student.studentNumber,
        `${r.student.firstName} ${r.student.lastName}`,
        r.session.section.course.name,
        r.session.section.code,
        r.status,
      ]),
    ];
  } else return Response.json({ error: 'Choose students or attendance.' }, { status: 400 });
  await db.auditLog.create({
    data: { actorId: user.id, action: 'EXPORT', entity: type, details: { rows: rows.length - 1 } },
  });
  return new Response('\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="academia-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
