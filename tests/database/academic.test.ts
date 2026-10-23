import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { db } from '../../src/lib/db';
import { requireUser } from '@/lib/auth';
import {
  enrollAction,
  createSectionAction,
  saveAttendanceAction,
  saveStudentAction,
  archiveStudentAction,
  withdrawAction,
} from '@/app/actions/academic';
import type { CurrentUser } from '@/lib/auth';
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const prefix = `it-${randomBytes(5).toString('hex')}`;
const ids = {
  department: `${prefix}-dept`,
  lecturer: `${prefix}-lecturer`,
  room: `${prefix}-room`,
  term: `${prefix}-term`,
  course: `${prefix}-course`,
  section: `${prefix}-section`,
};
let admin: CurrentUser, lecturer: CurrentUser, studentUser: CurrentUser;
const studentIds = [0, 1, 2].map((n) => `${prefix}-student-${n}`);
function form(data: Record<string, string>) {
  const f = new FormData();
  Object.entries(data).forEach(([k, v]) => f.set(k, v));
  return f;
}
const date = new Date().toISOString().slice(0, 10);
beforeAll(async () => {
  await db.department.create({ data: { id: ids.department, code: prefix, name: prefix } });
  const userData = { passwordHash: 'not-a-login-hash', disabled: false };
  admin = await db.user.create({
    data: {
      ...userData,
      email: `${prefix}-admin@test.invalid`,
      name: 'Integration admin',
      role: 'ADMIN',
    },
    include: { student: true, lecturer: true },
  });
  lecturer = await db.user.create({
    data: {
      ...userData,
      email: `${prefix}-lecturer@test.invalid`,
      name: 'Integration lecturer',
      role: 'LECTURER',
      lecturer: {
        create: {
          id: ids.lecturer,
          employeeNumber: prefix,
          name: prefix,
          email: `${prefix}-lecturer@test.invalid`,
          departmentId: ids.department,
        },
      },
    },
    include: { student: true, lecturer: true },
  });
  await db.classroom.create({ data: { id: ids.room, name: prefix, capacity: 20 } });
  const year = await db.academicYear.create({ data: { name: prefix } });
  await db.semester.create({
    data: {
      id: ids.term,
      name: prefix,
      academicYearId: year.id,
      startsAt: new Date('2020-01-01'),
      endsAt: new Date('2040-01-01'),
    },
  });
  await db.course.create({
    data: { id: ids.course, code: prefix, name: prefix, credits: 3, departmentId: ids.department },
  });
  await db.courseSection.create({
    data: {
      id: ids.section,
      code: prefix,
      courseId: ids.course,
      lecturerId: ids.lecturer,
      classroomId: ids.room,
      semesterId: ids.term,
      capacity: 1,
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 600,
    },
  });
  for (const [i, id] of studentIds.entries())
    await db.student.create({
      data: {
        id,
        studentNumber: id,
        firstName: 'Integration',
        lastName: String(i),
        email: `${id}@test.invalid`,
        departmentId: ids.department,
      },
    });
  studentUser = await db.user.create({
    data: { ...userData, email: `${prefix}-student@test.invalid`, name: prefix, role: 'STUDENT' },
    include: { student: true, lecturer: true },
  });
  await db.student.update({ where: { id: studentIds[0] }, data: { userId: studentUser.id } });
  studentUser = {
    ...studentUser,
    student: await db.student.findUniqueOrThrow({ where: { id: studentIds[0] } }),
  };
});
beforeEach(() => vi.mocked(requireUser).mockResolvedValue(admin));
afterAll(async () => {
  const students = await db.student.findMany({
    where: { departmentId: ids.department },
    select: { id: true },
  });
  const users = [admin?.id, lecturer?.id, studentUser?.id].filter(Boolean);
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.attendanceRecord.deleteMany({ where: { studentId: { in: students.map((s) => s.id) } } });
  await db.attendanceSession.deleteMany({ where: { section: { courseId: ids.course } } });
  await db.enrollment.deleteMany({ where: { section: { courseId: ids.course } } });
  await db.courseSection.deleteMany({ where: { courseId: ids.course } });
  await db.student.deleteMany({ where: { departmentId: ids.department } });
  await db.lecturer.deleteMany({ where: { departmentId: ids.department } });
  await db.course.deleteMany({ where: { id: ids.course } });
  await db.semester.deleteMany({ where: { id: ids.term } });
  await db.academicYear.deleteMany({ where: { name: prefix } });
  await db.classroom.deleteMany({ where: { id: ids.room } });
  await db.department.deleteMany({ where: { id: ids.department } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

describe('real PostgreSQL academic workflows', () => {
  it('registers a student, persists Unicode, and creates an audit entry atomically', async () => {
    const result = await saveStudentAction(
      {},
      form({
        firstName: 'សុខា',
        lastName: prefix,
        email: `${prefix}-new@test.invalid`,
        departmentId: ids.department,
        status: 'ACTIVE',
      }),
    );
    expect(result.success).toBeTruthy();
    const record = await db.student.findUniqueOrThrow({
      where: { email: `${prefix}-new@test.invalid` },
    });
    expect(record.firstName).toBe('សុខា');
    expect(record.studentNumber).toMatch(/^STU-/);
    expect(
      await db.auditLog.count({
        where: { actorId: admin.id, entityId: record.id, action: 'CREATE' },
      }),
    ).toBe(1);
    const duplicate = await saveStudentAction(
      {},
      form({
        firstName: 'Other',
        lastName: prefix,
        email: record.email,
        departmentId: ids.department,
        status: 'ACTIVE',
      }),
    );
    expect(duplicate.error).toContain('already exists');
  });
  it('rejects student and lecturer attempts to register students', async () => {
    for (const actor of [lecturer, studentUser]) {
      vi.mocked(requireUser).mockResolvedValue(actor);
      const result = await saveStudentAction(
        {},
        form({
          firstName: 'Attack',
          lastName: prefix,
          email: `${prefix}-attack@test.invalid`,
          departmentId: ids.department,
        }),
      );
      expect(result.error).toContain('permission');
    }
    expect(await db.student.count({ where: { email: `${prefix}-attack@test.invalid` } })).toBe(0);
  });
  it('serializes concurrent enrollments and does not overfill a class', async () => {
    const results = await Promise.all(
      studentIds
        .slice(0, 2)
        .map((studentId) => enrollAction({}, form({ studentId, sectionId: ids.section }))),
    );
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => r.error?.includes('full'))).toHaveLength(1);
    expect(await db.enrollment.count({ where: { sectionId: ids.section } })).toBe(1);
    await db.courseSection.update({ where: { id: ids.section }, data: { capacity: 5 } });
    for (const studentId of studentIds)
      if (
        !(await db.enrollment.findUnique({
          where: { studentId_sectionId: { studentId, sectionId: ids.section } },
        }))
      )
        expect(
          (await enrollAction({}, form({ studentId, sectionId: ids.section }))).success,
        ).toBeTruthy();
  });
  it('prevents lecturer and classroom schedule conflicts', async () => {
    const result = await createSectionAction(
      {},
      form({
        code: `${prefix}-conflict`,
        courseId: ids.course,
        lecturerId: ids.lecturer,
        semesterId: ids.term,
        classroomId: ids.room,
        capacity: '5',
        dayOfWeek: '1',
        startTime: '09:30',
        endTime: '10:30',
      }),
    );
    expect(result.error).toContain('already booked');
    expect(await db.courseSection.count({ where: { code: `${prefix}-conflict` } })).toBe(0);
  });
  it('rejects a partial roster and attendance for a class not assigned to the lecturer', async () => {
    const partial = await saveAttendanceAction(
      {},
      form({
        sectionId: ids.section,
        date,
        records: JSON.stringify([{ studentId: studentIds[0], status: 'PRESENT' }]),
      }),
    );
    expect(partial.error).toContain('roster changed');
    vi.mocked(requireUser).mockResolvedValue({ ...lecturer, lecturer: null });
    const denied = await saveAttendanceAction(
      {},
      form({
        sectionId: ids.section,
        date,
        records: JSON.stringify(studentIds.map((studentId) => ({ studentId, status: 'PRESENT' }))),
      }),
    );
    expect(denied.error).toContain('not assigned');
    expect(await db.attendanceSession.count({ where: { sectionId: ids.section } })).toBe(0);
  });
  it('persists assigned lecturer attendance, updates idempotently, and retains change history', async () => {
    vi.mocked(requireUser).mockResolvedValue(lecturer);
    const values = studentIds.map((studentId) => ({ studentId, status: 'PRESENT' }));
    expect(
      (
        await saveAttendanceAction(
          {},
          form({ sectionId: ids.section, date, records: JSON.stringify(values) }),
        )
      ).success,
    ).toBeTruthy();
    values[0].status = 'ABSENT';
    expect(
      (
        await saveAttendanceAction(
          {},
          form({ sectionId: ids.section, date, records: JSON.stringify(values) }),
        )
      ).success,
    ).toBeTruthy();
    expect(
      await db.attendanceRecord.count({ where: { session: { sectionId: ids.section } } }),
    ).toBe(3);
    expect(
      await db.attendanceRecord.count({ where: { studentId: studentIds[0], status: 'ABSENT' } }),
    ).toBe(1);
    const log = await db.auditLog.findFirstOrThrow({
      where: { actorId: lecturer.id, action: 'RECORD_ATTENDANCE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(JSON.stringify(log.details)).toContain('previous');
  });
  it('blocks future attendance and withdrawal that would orphan attendance history', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(
      (
        await saveAttendanceAction(
          {},
          form({
            sectionId: ids.section,
            date: tomorrow,
            records: JSON.stringify(
              studentIds.map((studentId) => ({ studentId, status: 'PRESENT' })),
            ),
          }),
        )
      ).error,
    ).toContain('future');
    const enrollment = await db.enrollment.findFirstOrThrow({ where: { sectionId: ids.section } });
    expect((await withdrawAction({}, form({ id: enrollment.id }))).error).toContain('history');
    expect(await db.enrollment.count({ where: { id: enrollment.id } })).toBe(1);
  });
  it('archives records without deleting history and revokes linked account sessions', async () => {
    await db.session.create({
      data: {
        userId: studentUser.id,
        tokenHash: prefix,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    expect((await archiveStudentAction({}, form({ id: studentIds[0] }))).success).toBeTruthy();
    expect((await db.student.findUniqueOrThrow({ where: { id: studentIds[0] } })).status).toBe(
      'ARCHIVED',
    );
    expect((await db.user.findUniqueOrThrow({ where: { id: studentUser.id } })).disabled).toBe(
      true,
    );
    expect(await db.session.count({ where: { userId: studentUser.id } })).toBe(0);
    expect(await db.attendanceRecord.count({ where: { studentId: studentIds[0] } })).toBe(1);
  });
});
