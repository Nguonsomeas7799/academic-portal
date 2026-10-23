import { requireUser } from '@/lib/auth';
import { academicRoles } from '@/lib/permissions';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { StudentForm } from '@/components/student-form';
export default async function NewStudentPage() {
  await requireUser(academicRoles);
  const departments = await db.department.findMany({ orderBy: { name: 'asc' } });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A NEW CHAPTER</div>
          <h1>Register a student</h1>
          <p>Bring a new member into your academic community.</p>
        </div>
      </div>
      <Card className="max-w-3xl">
        <div className="card-body">
          {!departments.length && (
            <p className="form-error mb-5">
              Create a department in Academics before registering a student.
            </p>
          )}
          <StudentForm departments={departments} />
        </div>
      </Card>
    </>
  );
}
