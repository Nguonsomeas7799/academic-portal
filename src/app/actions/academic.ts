'use server';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser, type CurrentUser } from '@/lib/auth';
import { academicRoles, canManageAcademics, canTakeAttendance } from '@/lib/permissions';
import {
  attendanceSchema,
  courseSchema,
  departmentSchema,
  lecturerSchema,
  sectionSchema,
  studentSchema,
  type ActionState,
} from '@/lib/validation';
import { overlaps } from '@/lib/utils';

function refresh() {
  for (const path of [
    '/dashboard',
    '/students',
    '/lecturers',
    '/academics',
    '/attendance',
    '/reports',
    '/audit',
  ])
    revalidatePath(path, 'page');
}
async function mutate(fn: (user: CurrentUser) => Promise<string>): Promise<ActionState> {
  try {
    const user = await requireUser();
    const success = await fn(user);
    refresh();
    return { success };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        return { error: 'This record already exists. Check the email address or unique code.' };
      if (error.code === 'P2003' || error.code === 'P2025')
        return { error: 'A selected record no longer exists. Refresh and try again.' };
      return { error: 'The change could not be saved. Please refresh and try again.' };
    }
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}
class UserError extends Error {}
function academic(user: CurrentUser) {
  if (!canManageAcademics(user.role))
    throw new UserError('You do not have permission to manage academic records.');
}
const idFrom = (form: FormData, field = 'id') => z.string().min(1).max(100).parse(form.get(field));
const number = (prefix: string) =>
  `${prefix}-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;

export async function saveStudentAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const input = studentSchema.parse(Object.fromEntries(form));
    const id = form.get('id') ? idFrom(form) : undefined;
    await db.$transaction(async (tx) => {
      const student = id
        ? await tx.student.update({ where: { id }, data: input })
        : await tx.student.create({ data: { ...input, studentNumber: number('STU') } });
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            name: `${input.firstName} ${input.lastName}`,
            email: input.email,
            ...(input.status === 'ARCHIVED' ? { disabled: true } : {}),
          },
        });
        if (input.status === 'ARCHIVED')
          await tx.session.deleteMany({ where: { userId: student.userId } });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: id ? 'UPDATE' : 'CREATE',
          entity: 'Student',
          entityId: student.id,
          details: { studentNumber: student.studentNumber, status: student.status },
        },
      });
    });
    if (id) revalidatePath(`/students/${id}`);
    return id ? 'Student record updated.' : 'Student registered successfully.';
  });
}

export async function archiveStudentAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const id = idFrom(form);
    await db.$transaction(async (tx) => {
      const student = await tx.student.update({ where: { id }, data: { status: 'ARCHIVED' } });
      if (student.userId) {
        await tx.user.update({ where: { id: student.userId }, data: { disabled: true } });
        await tx.session.deleteMany({ where: { userId: student.userId } });
      }
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'ARCHIVE', entity: 'Student', entityId: id },
      });
    });
    revalidatePath(`/students/${id}`);
    return 'Student archived. Academic history is retained and portal access is disabled.';
  });
}

export async function saveDepartmentAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const data = departmentSchema.parse(Object.fromEntries(form));
    const id = form.get('id') ? idFrom(form) : undefined;
    await db.$transaction(async (tx) => {
      const record = id
        ? await tx.department.update({ where: { id }, data })
        : await tx.department.create({ data });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: id ? 'UPDATE' : 'CREATE',
          entity: 'Department',
          entityId: record.id,
        },
      });
    });
    return 'Department saved.';
  });
}

export async function saveCourseAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const data = courseSchema.parse(Object.fromEntries(form));
    const id = form.get('id') ? idFrom(form) : undefined;
    await db.$transaction(async (tx) => {
      const record = id
        ? await tx.course.update({ where: { id }, data })
        : await tx.course.create({ data });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: id ? 'UPDATE' : 'CREATE',
          entity: 'Course',
          entityId: record.id,
        },
      });
    });
    return 'Course saved.';
  });
}

export async function saveLecturerAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const data = lecturerSchema.parse(Object.fromEntries(form));
    const id = form.get('id') ? idFrom(form) : undefined;
    await db.$transaction(async (tx) => {
      const record = id
        ? await tx.lecturer.update({ where: { id }, data })
        : await tx.lecturer.create({ data: { ...data, employeeNumber: number('EMP') } });
      if (record.userId)
        await tx.user.update({
          where: { id: record.userId },
          data: { name: record.name, email: record.email },
        });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: id ? 'UPDATE' : 'CREATE',
          entity: 'Lecturer',
          entityId: record.id,
        },
      });
    });
    return 'Lecturer saved.';
  });
}

export async function createTermAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        year: z.string().trim().min(4).max(30),
        startsAt: z.iso.date(),
        endsAt: z.iso.date(),
      })
      .refine((v) => v.startsAt < v.endsAt, { message: 'The term end must follow its start.' })
      .parse(Object.fromEntries(form));
    await db.$transaction(async (tx) => {
      const year = await tx.academicYear.upsert({
        where: { name: data.year },
        create: { name: data.year },
        update: {},
      });
      const term = await tx.semester.create({
        data: {
          name: data.name,
          academicYearId: year.id,
          startsAt: new Date(data.startsAt),
          endsAt: new Date(data.endsAt),
        },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'CREATE', entity: 'Semester', entityId: term.id },
      });
    });
    return 'Academic term created.';
  });
}

export async function createRoomAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const data = z
      .object({
        name: z.string().trim().min(2).max(60),
        capacity: z.coerce.number().int().min(1).max(500),
      })
      .parse(Object.fromEntries(form));
    await db.$transaction(async (tx) => {
      const room = await tx.classroom.create({ data });
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'CREATE', entity: 'Classroom', entityId: room.id },
      });
    });
    return 'Classroom created.';
  });
}

export async function createSectionAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const { startTime, endTime, ...data } = sectionSchema.parse(Object.fromEntries(form));
    const toMinute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const startMinute = toMinute(startTime),
      endMinute = toMinute(endTime);
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(48129)`;
      const room = await tx.classroom.findUniqueOrThrow({ where: { id: data.classroomId } });
      if (data.capacity > room.capacity)
        throw new UserError('Section capacity exceeds classroom capacity.');
      const term = await tx.semester.findUniqueOrThrow({ where: { id: data.semesterId } });
      const candidates = await tx.courseSection.findMany({
        where: {
          dayOfWeek: data.dayOfWeek,
          OR: [{ lecturerId: data.lecturerId }, { classroomId: data.classroomId }],
          semester: { startsAt: { lte: term.endsAt }, endsAt: { gte: term.startsAt } },
        },
      });
      if (candidates.some((s) => overlaps(startMinute, endMinute, s.startMinute, s.endMinute)))
        throw new UserError('The lecturer or classroom is already booked at this time.');
      const section = await tx.courseSection.create({ data: { ...data, startMinute, endMinute } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'CREATE', entity: 'CourseSection', entityId: section.id },
      });
    });
    return 'Class section created.';
  });
}

export async function enrollAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const studentId = idFrom(form, 'studentId'),
      sectionId = idFrom(form, 'sectionId');
    await db.$transaction(async (tx) => {
      // Also serialize across a student's enrollments to prevent concurrent timetable collisions.
      await tx.$queryRaw`SELECT "id" FROM "Student" WHERE "id" = ${studentId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "CourseSection" WHERE "id" = ${sectionId} FOR UPDATE`;
      const student = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
      const section = await tx.courseSection.findUniqueOrThrow({
        where: { id: sectionId },
        include: { semester: true },
      });
      const count = await tx.enrollment.count({ where: { sectionId } });
      const existing = await tx.enrollment.findMany({
        where: { studentId },
        include: { section: { include: { semester: true } } },
      });
      if (student.status !== 'ACTIVE') throw new UserError('Only active students can be enrolled.');
      if (count >= section.capacity) throw new UserError('This class is full.');
      if (existing.some((e) => e.sectionId === sectionId))
        throw new UserError('The student is already enrolled in this class.');
      if (
        existing.some(
          ({ section: s }) =>
            s.semester.startsAt <= section.semester.endsAt &&
            s.semester.endsAt >= section.semester.startsAt &&
            s.dayOfWeek === section.dayOfWeek &&
            overlaps(s.startMinute, s.endMinute, section.startMinute, section.endMinute),
        )
      )
        throw new UserError('This class conflicts with the student’s timetable.');
      const enrollment = await tx.enrollment.create({ data: { studentId, sectionId } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ENROLL',
          entity: 'Enrollment',
          entityId: enrollment.id,
          details: { studentId, sectionId },
        },
      });
    });
    revalidatePath(`/students/${studentId}`);
    return 'Student enrolled.';
  });
}

export async function withdrawAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    academic(user);
    const id = idFrom(form);
    const enrollment = await db.enrollment.findUniqueOrThrow({ where: { id } });
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CourseSection" WHERE "id" = ${enrollment.sectionId} FOR UPDATE`;
      const count = await tx.attendanceRecord.count({
        where: { studentId: enrollment.studentId, session: { sectionId: enrollment.sectionId } },
      });
      if (count)
        throw new UserError(
          'Attendance already exists. This enrollment must be retained to preserve academic history.',
        );
      await tx.enrollment.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'WITHDRAW',
          entity: 'Enrollment',
          entityId: id,
          details: { studentId: enrollment.studentId, sectionId: enrollment.sectionId },
        },
      });
    });
    revalidatePath(`/students/${enrollment.studentId}`);
    return 'Enrollment removed.';
  });
}

export async function saveAttendanceAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    if (!canTakeAttendance(user.role)) throw new UserError('You cannot record attendance.');
    let records: unknown;
    try {
      records = JSON.parse(String(form.get('records')));
    } catch {
      throw new UserError('Invalid attendance records.');
    }
    const data = attendanceSchema.parse({
      sectionId: form.get('sectionId'),
      date: form.get('date'),
      records,
    });
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(
      new Date(),
    );
    if (data.date > today) throw new UserError('Attendance cannot be recorded for a future date.');
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CourseSection" WHERE "id" = ${data.sectionId} FOR UPDATE`;
      const section = await tx.courseSection.findUniqueOrThrow({
        where: { id: data.sectionId },
        include: { enrollments: true, semester: true },
      });
      if (user.role === 'LECTURER' && section.lecturerId !== user.lecturer?.id)
        throw new UserError('This class is not assigned to you.');
      const date = new Date(data.date);
      if (date < section.semester.startsAt || date > section.semester.endsAt)
        throw new UserError('The attendance date is outside the academic term.');
      const ids = new Set(data.records.map((r) => r.studentId));
      if (
        ids.size !== data.records.length ||
        ids.size !== section.enrollments.length ||
        section.enrollments.some((e) => !ids.has(e.studentId))
      )
        throw new UserError('The class roster changed. Refresh and record all enrolled students.');
      const session = await tx.attendanceSession.upsert({
        where: { sectionId_date: { sectionId: data.sectionId, date } },
        create: { sectionId: data.sectionId, date },
        update: {},
      });
      const previous = await tx.attendanceRecord.findMany({
        where: { sessionId: session.id },
        select: { studentId: true, status: true },
      });
      for (const record of data.records)
        await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: record.studentId } },
          create: { ...record, sessionId: session.id },
          update: { status: record.status },
        });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'RECORD_ATTENDANCE',
          entity: 'AttendanceSession',
          entityId: session.id,
          details: { sectionId: data.sectionId, date: data.date, previous, records: data.records },
        },
      });
    });
    return 'Attendance saved for the entire class.';
  });
}

export async function postAnnouncementAction(_: ActionState, form: FormData) {
  return mutate(async (user) => {
    if (!academicRoles.includes(user.role))
      throw new UserError('You cannot publish announcements.');
    const data = z
      .object({
        title: z.string().trim().min(3).max(120),
        body: z.string().trim().min(5).max(2000),
      })
      .parse(Object.fromEntries(form));
    await db.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({ data: { ...data, authorId: user.id } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'PUBLISH',
          entity: 'Announcement',
          entityId: announcement.id,
        },
      });
    });
    return 'Announcement published to all portal users.';
  });
}
