import { z } from 'zod';
export const email = z.email().trim().toLowerCase().max(254);
export const password = z.string().min(12, 'Use at least 12 characters.').max(128);
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const studentSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  email,
  phone: z.string().trim().max(40).default(''),
  emergencyContact: z.string().trim().max(200).default(''),
  departmentId: z.string().min(1, 'Choose a department.'),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'ARCHIVED']).default('ACTIVE'),
});
export type StudentInput = z.input<typeof studentSchema>;
export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Z0-9-]+$/),
});
export const courseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(2).max(150),
  credits: z.coerce.number().int().min(1).max(12),
  departmentId: z.string().min(1),
  description: z.string().trim().max(1000).default(''),
});
export const lecturerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  qualification: z.string().trim().max(200).default(''),
  departmentId: z.string().min(1),
});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const sectionSchema = z
  .object({
    code: z.string().trim().min(2).max(30),
    courseId: z.string().min(1),
    lecturerId: z.string().min(1),
    semesterId: z.string().min(1),
    classroomId: z.string().min(1),
    capacity: z.coerce.number().int().min(1).max(500),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'End time must follow start time.',
    path: ['endTime'],
  });
export const attendanceSchema = z.object({
  sectionId: z.string().min(1),
  date: z.iso.date(),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      }),
    )
    .min(1)
    .max(500),
});
export type ActionState = { error?: string; success?: string; fields?: Record<string, string[]> };
