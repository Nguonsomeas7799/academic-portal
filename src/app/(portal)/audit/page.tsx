import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { adminRoles } from '@/lib/permissions';
import { Card, Badge, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
export const metadata = { title: 'Audit trail' };
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string; q?: string }>;
}) {
  await requireUser(adminRoles);
  const p = await searchParams;
  const entity = typeof p.entity === 'string' ? p.entity.slice(0, 40) : '';
  const q = typeof p.q === 'string' ? p.q.slice(0, 100) : '';
  const where = {
    ...(entity ? { entity } : {}),
    ...(q ? { action: { contains: q, mode: 'insensitive' as const } } : {}),
  };
  const count = await db.auditLog.count({ where });
  const page = Math.max(
    1,
    Math.min(Math.floor(Number(p.page) || 1), Math.max(1, Math.ceil(count / 25))),
  );
  const [logs, entities] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * 25,
      take: 25,
      include: { actor: { select: { name: true } } },
    }),
    db.auditLog.findMany({ distinct: ['entity'], select: { entity: true } }),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACCOUNTABILITY, BUILT IN</div>
          <h1>Audit trail</h1>
          <p>A record of security and academic changes. Times shown in Asia/Phnom_Penh.</p>
        </div>
        <Badge tone="green">Append-only through the application</Badge>
      </div>
      <Card>
        <form action="/audit" className="section-toolbar">
          <Input
            name="q"
            placeholder="Search action…"
            defaultValue={q}
            aria-label="Search audit actions"
          />
          <Select name="entity" defaultValue={entity} aria-label="Filter entity">
            <option value="">All entities</option>
            {entities.map((e) => (
              <option key={e.entity}>{e.entity}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </form>
        {logs.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="muted">
                      {new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Phnom_Penh',
                      }).format(log.createdAt)}
                    </td>
                    <td>{log.actor?.name ?? 'System'}</td>
                    <td>
                      <Badge tone="purple">{log.action.replaceAll('_', ' ').toLowerCase()}</Badge>
                    </td>
                    <td>
                      {log.entity}
                      <small className="block muted mt-1">{log.entityId?.slice(0, 16)}</small>
                    </td>
                    <td>
                      {log.details ? (
                        <details>
                          <summary className="cursor-pointer text-xs muted">View details</summary>
                          <pre className="whitespace-pre-wrap max-w-sm mt-3 text-[10px]">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching activity"
            description="Security and academic changes are recorded here."
          />
        )}
        <div className="table-footer">
          <span>
            {count} events · page {page}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/audit?page=${page - 1}&entity=${encodeURIComponent(entity)}&q=${encodeURIComponent(q)}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page * 25 < count && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/audit?page=${page + 1}&entity=${encodeURIComponent(entity)}&q=${encodeURIComponent(q)}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
