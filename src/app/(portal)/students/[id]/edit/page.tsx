import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { academicRoles } from '@/lib/permissions';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { StudentForm } from '@/components/student-form';
export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(academicRoles);
  const { id } = await params;
  const [student, departments] = await Promise.all([
    db.student.findUnique({ where: { id } }),
    db.department.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!student) notFound();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC REGISTRY</div>
          <h1>Edit student record</h1>
          <p>
            {student.studentNumber} · {student.firstName} {student.lastName}
          </p>
        </div>
      </div>
      <Card className="max-w-3xl">
        <div className="card-body">
          <StudentForm
            departments={departments}
            student={{
              ...student,
              phone: student.phone ?? '',
              emergencyContact: student.emergencyContact ?? '',
            }}
          />
        </div>
      </Card>
    </>
  );
}
