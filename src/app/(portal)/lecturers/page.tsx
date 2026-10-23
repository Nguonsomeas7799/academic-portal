import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { academicRoles } from '@/lib/permissions';
import { db } from '@/lib/db';
import { initials } from '@/lib/utils';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Modal } from '@/components/modal';
import { LecturerForm } from '@/components/academic-forms';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
export const metadata = { title: 'Lecturers' };
export default async function LecturersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser(academicRoles);
  const p = await searchParams;
  const q = typeof p.q === 'string' ? p.q.slice(0, 100) : '';
  const departmentId = typeof p.department === 'string' ? p.department : '';
  const where = {
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(departmentId ? { departmentId } : {}),
  };
  const count = await db.lecturer.count({ where });
  const page = Math.max(
    1,
    Math.min(Math.floor(Number(p.page) || 1), Math.max(1, Math.ceil(count / 12))),
  );
  const [lecturers, departments] = await Promise.all([
    db.lecturer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * 12,
      take: 12,
      include: { department: true, _count: { select: { sections: true } } },
    }),
    db.department.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PEOPLE WHO INSPIRE</div>
          <h1>Lecturers</h1>
          <p>The minds and mentors making a difference.</p>
        </div>
        <Modal
          title="Add lecturer"
          trigger={
            <>
              <Plus size={14} />
              Add lecturer
            </>
          }
        >
          <LecturerForm departments={departments} />
        </Modal>
      </div>
      <Card className="section-gap">
        <form className="section-toolbar" action="/lecturers">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search lecturers…"
            aria-label="Search lecturers"
          />
          <Select name="department" defaultValue={departmentId} aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </Card>
      <div className="three-columns">
        {lecturers.map((l) => (
          <Card className="section-tile" key={l.id}>
            <div className="flex items-center justify-between mb-5">
              <span className="avatar avatar-green" style={{ width: 45, height: 45 }}>
                {initials(l.name)}
              </span>
              <Badge tone="green">{l._count.sections} classes</Badge>
            </div>
            <h2>{l.name}</h2>
            <p>
              {l.department.name}
              <br />
              {l.email}
            </p>
            <p>{l.qualification ?? 'Qualifications not provided'}</p>
            <footer>
              <span className="muted">{l.employeeNumber}</span>
              <Modal title="Edit lecturer" trigger="Edit">
                <LecturerForm departments={departments} lecturer={l} />
              </Modal>
            </footer>
          </Card>
        ))}
      </div>
      {!lecturers.length && (
        <Card>
          <EmptyState
            title="No lecturers found"
            description="Add your teaching team, or try another search."
          />
        </Card>
      )}
      <div className="table-footer">
        <span>
          {count} lecturers · page {page}
        </span>
        <div className="flex gap-3">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link
                href={`/lecturers?q=${encodeURIComponent(q)}&department=${departmentId}&page=${page - 1}`}
              >
                Previous
              </Link>
            </Button>
          )}
          {page * 12 < count && (
            <Button asChild variant="outline">
              <Link
                href={`/lecturers?q=${encodeURIComponent(q)}&department=${departmentId}&page=${page + 1}`}
              >
                Next
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
