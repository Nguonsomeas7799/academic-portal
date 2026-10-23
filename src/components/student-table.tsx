'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ArrowDownUp, ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge, EmptyState } from './ui/card';
import { Button } from './ui/button';
import { Input, Select } from './ui/input';
import { initials } from '@/lib/utils';
import { dictionary, type Locale } from '@/lib/i18n';
export type StudentRow = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  department: { name: string };
};
export function StudentTable({
  data,
  total,
  page,
  pageSize,
  departments,
  locale,
}: {
  data: StudentRow[];
  total: number;
  page: number;
  pageSize: number;
  departments: { id: string; name: string }[];
  locale: Locale;
}) {
  const router = useRouter(),
    params = useSearchParams(),
    t = dictionary[locale];
  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: 'name',
        header: t.name,
        cell: ({ row: { original: s } }) => (
          <Link href={`/students/${s.id}`} className="table-person">
            <span className="avatar avatar-purple">{initials(`${s.firstName} ${s.lastName}`)}</span>
            <span>
              <strong>
                {s.firstName} {s.lastName}
              </strong>
              <small>{s.studentNumber}</small>
            </span>
          </Link>
        ),
      },
      {
        accessorKey: 'email',
        header: t.email,
        cell: (info) => <span className="muted">{info.getValue<string>()}</span>,
      },
      { id: 'department', header: t.department, accessorFn: (s) => s.department.name },
      {
        accessorKey: 'status',
        header: t.status,
        cell: (info) => (
          <Badge
            tone={
              info.getValue() === 'ACTIVE'
                ? 'green'
                : info.getValue() === 'ON_LEAVE'
                  ? 'amber'
                  : 'neutral'
            }
          >
            {info.getValue<string>().replace('_', ' ').toLowerCase()}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t.actions,
        cell: ({ row }) => (
          <Link
            href={`/students/${row.original.id}`}
            className="card-link"
            aria-label={`View ${row.original.firstName} ${row.original.lastName}`}
          >
            View record <ArrowUpRight size={13} />
          </Link>
        ),
      },
    ],
    [t],
  );
  // Sorting, search and pagination execute in PostgreSQL; TanStack renders the server page.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
  });
  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.push(`/students?${next}`);
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <>
      <form action="/students" className="section-toolbar">
        <div className="search-field">
          <Search size={16} />
          <Input
            name="q"
            defaultValue={params.get('q') ?? ''}
            placeholder="Search by name, ID or email…"
            aria-label="Search students"
            maxLength={100}
          />
        </div>
        <Select
          name="department"
          defaultValue={params.get('department') ?? ''}
          aria-label="Filter department"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option value={d.id} key={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={params.get('status') ?? ''} aria-label="Filter status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On leave</option>
          <option value="GRADUATED">Graduated</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
        <input type="hidden" name="sort" value={params.get('sort') ?? 'recent'} />
        <Button type="submit" variant="outline" size="sm">
          Apply filters
        </Button>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id}>
                    {['name', 'department', 'status'].includes(header.column.id) ? (
                      <button
                        onClick={() =>
                          navigate({
                            sort:
                              params.get('sort') === `${header.column.id}-asc`
                                ? `${header.column.id}-desc`
                                : `${header.column.id}-asc`,
                            page: '1',
                          })
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowDownUp size={10} />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.original.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.length && (
        <EmptyState
          title="No students found"
          description="Try another search or register your first student to get started."
        />
      )}
      <div className="table-footer">
        <span>
          Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of{' '}
          {total} students
        </span>
        <div className="pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ page: String(page - 1) })}
            aria-label="Previous page"
          >
            <ChevronLeft size={13} />
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => navigate({ page: String(page + 1) })}
            aria-label="Next page"
          >
            <ChevronRight size={13} />
          </Button>
        </div>
      </div>
    </>
  );
}
