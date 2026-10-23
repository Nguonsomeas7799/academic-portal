import 'dotenv/config';
import { PrismaClient, Role, AttendanceStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/lib/password';
import { password } from '../src/lib/validation';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const input = password.safeParse(process.env.DEMO_PASSWORD);
  if (!input.success)
    throw new Error(
      'Set DEMO_PASSWORD (12–128 characters) in your ignored .env or process environment. No default password is provided.',
    );
  const passwordHash = await hashPassword(input.data);
  const year = new Date().getUTCFullYear();
  await db.$transaction(
    async (tx) => {
      const faculty = await tx.faculty.upsert({
        where: { name: 'Demo · Faculty of Arts & Sciences' },
        update: {},
        create: { id: 'demo-faculty', name: 'Demo · Faculty of Arts & Sciences' },
      });
      const departmentNames = [
        'Computer Science',
        'Business Studies',
        'Design & Media',
        'Engineering',
      ];
      const departments = [];
      for (let i = 0; i < 4; i++)
        departments.push(
          await tx.department.upsert({
            where: { code: `DEMO-${i + 1}` },
            update: {},
            create: {
              id: `demo-dept-${i}`,
              name: departmentNames[i],
              code: `DEMO-${i + 1}`,
              facultyId: faculty.id,
            },
          }),
        );
      const academicYear = await tx.academicYear.upsert({
        where: { name: `${year} · Demo` },
        update: {},
        create: { name: `${year} · Demo` },
      });
      const term = await tx.semester.upsert({
        where: {
          academicYearId_name: { academicYearId: academicYear.id, name: 'Demo academic term' },
        },
        update: {},
        create: {
          academicYearId: academicYear.id,
          name: 'Demo academic term',
          startsAt: new Date(`${year}-01-01`),
          endsAt: new Date(`${year}-12-31`),
        },
      });
      const names = [
        'Sok Dara',
        'Chan Sophea',
        'Emma Wilson',
        'Vannak Chea',
        'Lina Sok',
        'Oliver Chen',
      ];
      const lecturerIds = [];
      for (let i = 0; i < names.length; i++) {
        const l = await tx.lecturer.upsert({
          where: { employeeNumber: `DEMO-EMP-${i + 1}` },
          update: {},
          create: {
            id: `demo-lecturer-${i}`,
            employeeNumber: `DEMO-EMP-${i + 1}`,
            name: names[i],
            email: i === 0 ? 'lecturer@demo.academic.test' : `lecturer${i + 1}@demo.academic.test`,
            departmentId: departments[i % 4].id,
            qualification: 'PhD · Demo teaching profile',
          },
        });
        lecturerIds.push(l.id);
      }
      const courses = [
        'Introduction to Computing',
        'Business Fundamentals',
        'Visual Communication',
        'Applied Mathematics',
        'Database Systems',
        'Principles of Marketing',
        'Interaction Design',
        'Engineering Mechanics',
      ];
      const sectionIds = [];
      for (let i = 0; i < courses.length; i++) {
        const room = await tx.classroom.upsert({
          where: { name: `Demo · Room ${201 + i}` },
          update: {},
          create: { name: `Demo · Room ${201 + i}`, capacity: 35 },
        });
        const course = await tx.course.upsert({
          where: { code: `DEMO-${101 + i}` },
          update: {},
          create: {
            code: `DEMO-${101 + i}`,
            name: courses[i],
            departmentId: departments[i % 4].id,
            credits: 3,
            description: 'Clearly labeled demonstration course. Not an actual academic offering.',
          },
        });
        const section = await tx.courseSection.upsert({
          where: { code: `DEMO-${101 + i}-A-${year}` },
          update: {},
          create: {
            id: `demo-section-${i}-${year}`,
            code: `DEMO-${101 + i}-A-${year}`,
            courseId: course.id,
            lecturerId: lecturerIds[i % 6],
            classroomId: room.id,
            semesterId: term.id,
            capacity: 30,
            dayOfWeek: (i % 5) + 1,
            startMinute: i < 5 ? 540 : 780,
            endMinute: i < 5 ? 630 : 870,
          },
        });
        sectionIds.push(section.id);
      }
      const first = [
        'Sokha',
        'Sreypov',
        'Dara',
        'Sophea',
        'Vannak',
        'Lina',
        'Alex',
        'Emma',
        'Nita',
        'Rithy',
        'Sovan',
        'Maly',
        'David',
        'Lily',
        'Serey',
        'Bopha',
        'Kevin',
        'Chenda',
        'Leakhena',
        'Rachana',
        'Narin',
        'Mony',
        'Sothy',
        'Panha',
        'Sophorn',
        'Socheata',
        'Daniel',
        'Mia',
        'Kosal',
        'Sreyneang',
        'Visal',
        'Rina',
      ];
      const last = ['Chan', 'Sok', 'Chea', 'Kim', 'Heng', 'Lim', 'Tan', 'Wilson'];
      for (let i = 0; i < first.length; i++) {
        const joinedAt = new Date();
        joinedAt.setUTCDate(joinedAt.getUTCDate() - (35 - i));
        const student = await tx.student.upsert({
          where: { studentNumber: `DEMO-STU-${String(i + 1).padStart(4, '0')}` },
          update: {},
          create: {
            id: `demo-student-${i}`,
            studentNumber: `DEMO-STU-${String(i + 1).padStart(4, '0')}`,
            firstName: first[i],
            lastName: last[i % last.length],
            email: i === 0 ? 'student@demo.academic.test' : `student${i + 1}@demo.academic.test`,
            departmentId: departments[i % 4].id,
            joinedAt,
            status: i === 31 ? 'ON_LEAVE' : 'ACTIVE',
          },
        });
        for (const sectionId of [sectionIds[i % 4], sectionIds[(i % 4) + 4]]) {
          await tx.enrollment.upsert({
            where: { studentId_sectionId: { studentId: student.id, sectionId } },
            update: {},
            create: { studentId: student.id, sectionId },
          });
          for (let day = 0; day < 7; day++) {
            const date = new Date();
            date.setUTCDate(date.getUTCDate() - day);
            date.setUTCHours(0, 0, 0, 0);
            if (date < term.startsAt || date > term.endsAt) continue;
            const session = await tx.attendanceSession.upsert({
              where: { sectionId_date: { sectionId, date } },
              update: {},
              create: { sectionId, date },
            });
            const status: AttendanceStatus =
              (i + day) % 13 === 0
                ? 'ABSENT'
                : (i + day) % 11 === 0
                  ? 'LATE'
                  : (i + day) % 17 === 0
                    ? 'EXCUSED'
                    : 'PRESENT';
            await tx.attendanceRecord.upsert({
              where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
              update: {},
              create: { sessionId: session.id, studentId: student.id, status },
            });
          }
        }
      }
      let adminId = '';
      const roles: Role[] = [
        'SUPER_ADMIN',
        'ADMIN',
        'REGISTRAR',
        'LECTURER',
        'STUDENT',
        'ACCOUNTANT',
      ];
      for (const role of roles) {
        const name = role === 'SUPER_ADMIN' ? 'superadmin' : role.toLowerCase();
        const user = await tx.user.upsert({
          where: { email: `${name}@demo.academic.test` },
          update: {},
          create: {
            email: `${name}@demo.academic.test`,
            name:
              role === 'ADMIN'
                ? 'Alex Morgan'
                : role === 'STUDENT'
                  ? 'Sokha Chan'
                  : role === 'LECTURER'
                    ? names[0]
                    : `Demo ${name}`,
            role,
            passwordHash,
          },
        });
        if (user.role !== role)
          throw new Error(
            'Existing demo email has a different role; seed stopped without changes.',
          );
        if (role === 'ADMIN') adminId = user.id;
        if (role === 'STUDENT')
          await tx.student.update({ where: { id: 'demo-student-0' }, data: { userId: user.id } });
        if (role === 'LECTURER')
          await tx.lecturer.update({ where: { id: lecturerIds[0] }, data: { userId: user.id } });
      }
      for (const [index, title, body] of [
        [
          '1',
          'Demo · A warm welcome to your campus',
          'This workspace contains sample students, courses and attendance. Explore the academic core, then use a separate database for real campus records.',
        ],
        [
          '2',
          'Demo · Make every check-in count',
          'Lecturers can open Attendance, choose an assigned class and date, and record the complete roster. Every change leaves an audit record.',
        ],
        [
          '3',
          'Demo · Your week, in one place',
          'Find your course sections, lecturers, classrooms and weekly schedules in Academics. All times use Asia/Phnom_Penh.',
        ],
      ])
        await tx.announcement.upsert({
          where: { id: `demo-notice-${index}` },
          update: {},
          create: { id: `demo-notice-${index}`, title, body, authorId: adminId },
        });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'DEMO_SEED',
          entity: 'System',
          details: {
            label: 'Sample data only; no existing passwords or academic records overwritten.',
          },
        },
      });
    },
    { timeout: 60000 },
  );
  console.log(
    'Demo seed complete: 32 students, 6 lecturers, 8 classes and six role accounts. Emails: {superadmin,admin,registrar,lecturer,student,accountant}@demo.academic.test. Passwords use DEMO_PASSWORD on first creation; existing passwords are preserved.',
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
