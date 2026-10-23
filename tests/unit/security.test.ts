import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';
import {
  roles,
  canManageAcademics,
  canViewAcademics,
  canTakeAttendance,
  canViewAudit,
  mayAccessStudent,
} from '../../src/lib/permissions';
import { csvCell, overlaps } from '../../src/lib/utils';
import { attendanceSchema, studentSchema, sectionSchema } from '../../src/lib/validation';

describe('password storage', () => {
  it('salts password hashes, verifies correct passwords and rejects wrong passwords', async () => {
    const secret = crypto.randomUUID();
    const a = await hashPassword(secret),
      b = await hashPassword(secret);
    expect(a).not.toBe(b);
    expect(a).not.toContain(secret);
    expect(await verifyPassword(secret, a)).toBe(true);
    expect(await verifyPassword('incorrect', a)).toBe(false);
    expect(await verifyPassword(secret, 'corrupted')).toBe(false);
  });
});
describe('least privilege roles and ownership', () => {
  it.each(roles)('enforces the permission matrix for %s', (role) => {
    const admin = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'].includes(role);
    expect(canManageAcademics(role)).toBe(admin);
    expect(canViewAcademics(role)).toBe(role !== 'ACCOUNTANT');
    expect(canTakeAttendance(role)).toBe(admin || role === 'LECTURER');
    expect(canViewAudit(role)).toBe(['SUPER_ADMIN', 'ADMIN'].includes(role));
    expect(mayAccessStudent(role, 'student-a', 'student-b')).toBe(admin);
    expect(mayAccessStudent(role, 'student-a', 'student-a')).toBe(admin || role === 'STUDENT');
    expect(mayAccessStudent(role, undefined, 'student-a')).toBe(admin);
  });
});
describe('safe spreadsheet exports', () => {
  it.each(['=HYPERLINK("x")', '+SUM(1,2)', '-10', '@cmd', '  =1+1', '\tmalicious', '\rtest'])(
    'neutralizes formula cells: %s',
    (value) => {
      expect(csvCell(value).startsWith('"\'')).toBe(true);
    },
  );
  it('escapes quotes and preserves Unicode', () => {
    expect(csvCell('សុខា "Chan"')).toBe('"សុខា ""Chan"""');
  });
});
describe('input and calendar validation', () => {
  it('accepts Unicode student names and strips unapproved fields', () => {
    const result = studentSchema.parse({
      firstName: 'សុខា',
      lastName: 'ចាន់',
      email: 'STUDENT@example.edu',
      departmentId: 'dept',
      role: 'SUPER_ADMIN',
    });
    expect(result.firstName).toBe('សុខា');
    expect(result.email).toBe('student@example.edu');
    expect(result).not.toHaveProperty('role');
  });
  it('rejects invalid status, empty identity and malformed attendance dates', () => {
    expect(
      studentSchema.safeParse({ firstName: '', lastName: 'Chan', email: 'bad', departmentId: '' })
        .success,
    ).toBe(false);
    expect(
      attendanceSchema.safeParse({
        sectionId: 'a',
        date: '2026-02-30',
        records: [{ studentId: 'a', status: 'PRESENT' }],
      }).success,
    ).toBe(false);
    expect(
      attendanceSchema.safeParse({
        sectionId: 'a',
        date: '2026-10-01',
        records: [{ studentId: 'a', status: 'UNKNOWN' }],
      }).success,
    ).toBe(false);
  });
  it('rejects zero capacity and reversed section times', () => {
    const base = {
      code: 'CS-A',
      courseId: 'c',
      lecturerId: 'l',
      semesterId: 's',
      classroomId: 'r',
      dayOfWeek: 1,
      capacity: 20,
      startTime: '10:00',
      endTime: '09:00',
    };
    expect(sectionSchema.safeParse(base).success).toBe(false);
    expect(sectionSchema.safeParse({ ...base, endTime: '12:00', capacity: 0 }).success).toBe(false);
    expect(sectionSchema.safeParse({ ...base, endTime: '12:00' }).success).toBe(true);
  });
  it('detects overlaps while allowing adjacent classes', () => {
    expect(overlaps(540, 600, 590, 650)).toBe(true);
    expect(overlaps(540, 600, 500, 650)).toBe(true);
    expect(overlaps(540, 600, 600, 660)).toBe(false);
  });
});
