'use client';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { saveAttendanceAction } from '@/app/actions/academic';
import { type ActionState } from '@/lib/validation';
import { initials } from '@/lib/utils';
import { Button } from './ui/button';
import { Select } from './ui/input';
export function AttendanceRoster({
  sectionId,
  date,
  students,
}: {
  sectionId: string;
  date: string;
  students: { id: string; name: string; number: string; status: string }[];
}) {
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(students.map((s) => [s.id, s.status])),
  );
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAttendanceAction, {});
  const marked = Object.values(statuses).filter(Boolean).length;
  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);
  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />
      <input
        type="hidden"
        name="records"
        value={JSON.stringify(students.map((s) => ({ studentId: s.id, status: statuses[s.id] })))}
      />
      <div className="attendance-actions">
        <span className="muted text-xs">
          {marked} of {students.length} students marked
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStatuses(Object.fromEntries(students.map((s) => [s.id, 'PRESENT'])))}
        >
          Mark all present
        </Button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Student ID</th>
              <th>Attendance status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="table-person">
                    <span className="avatar avatar-purple">{initials(s.name)}</span>
                    <strong>{s.name}</strong>
                  </div>
                </td>
                <td className="muted">{s.number}</td>
                <td>
                  <Select
                    className="attendance-status"
                    aria-label={`Attendance for ${s.name}`}
                    required
                    value={statuses[s.id]}
                    onChange={(e) => setStatuses((old) => ({ ...old, [s.id]: e.target.value }))}
                  >
                    <option value="">Select status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="EXCUSED">Excused</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="attendance-actions">
        <div>
          {state.error && (
            <p role="alert" className="form-error">
              {state.error}
            </p>
          )}
          {state.success && (
            <p role="status" className="form-success">
              {state.success}
            </p>
          )}
          <p className="muted text-[10px] mt-2">
            All changes are saved together and recorded in the audit trail.
          </p>
        </div>
        <Button disabled={pending || marked !== students.length || !students.length}>
          {pending ? 'Saving attendance…' : 'Save attendance'}
        </Button>
      </div>
    </form>
  );
}
