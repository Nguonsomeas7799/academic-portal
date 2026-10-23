import type { Role } from '@prisma/client';
export const roles = [
  'SUPER_ADMIN',
  'ADMIN',
  'REGISTRAR',
  'LECTURER',
  'STUDENT',
  'ACCOUNTANT',
] as const;
export const academicRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'];
export const adminRoles: Role[] = ['SUPER_ADMIN', 'ADMIN'];
export const canManageAcademics = (role: Role) => academicRoles.includes(role);
export const canViewAcademics = (role: Role) => role !== 'ACCOUNTANT';
export const canTakeAttendance = (role: Role) => canManageAcademics(role) || role === 'LECTURER';
export const canViewAudit = (role: Role) => adminRoles.includes(role);
export const roleLabel = (role: Role) =>
  ({
    SUPER_ADMIN: 'Super administrator',
    ADMIN: 'Administrator',
    REGISTRAR: 'Registrar',
    LECTURER: 'Lecturer',
    STUDENT: 'Student',
    ACCOUNTANT: 'Accountant',
  })[role];
export function mayAccessStudent(
  role: Role,
  linkedStudentId: string | undefined,
  targetId: string,
) {
  return (
    canManageAcademics(role) ||
    (role === 'STUDENT' && !!linkedStudentId && linkedStudentId === targetId)
  );
}
