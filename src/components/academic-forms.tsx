import { ActionForm, Field } from './action-form';
import { Input, Select, Textarea } from './ui/input';
import {
  saveCourseAction,
  saveDepartmentAction,
  saveLecturerAction,
  createSectionAction,
  createTermAction,
  createRoomAction,
} from '@/app/actions/academic';
type Option = { id: string; name: string };
export function DepartmentForm({
  department,
}: {
  department?: { id: string; name: string; code: string };
}) {
  return (
    <ActionForm
      action={saveDepartmentAction}
      reset={!department}
      label={department ? 'Update department' : 'Create department'}
    >
      {department && <input type="hidden" name="id" value={department.id} />}
      <Field label="Department name">
        <Input name="name" required minLength={2} maxLength={100} defaultValue={department?.name} />
      </Field>
      <Field label="Code" hint="Uppercase letters, numbers and hyphens.">
        <Input
          name="code"
          required
          minLength={2}
          maxLength={12}
          pattern="[A-Z0-9\-]+"
          defaultValue={department?.code}
        />
      </Field>
    </ActionForm>
  );
}
export function CourseForm({
  departments,
  course,
}: {
  departments: Option[];
  course?: {
    id: string;
    code: string;
    name: string;
    credits: number;
    departmentId: string;
    description: string | null;
  };
}) {
  return (
    <ActionForm
      action={saveCourseAction}
      reset={!course}
      label={course ? 'Update course' : 'Create course'}
    >
      {course && <input type="hidden" name="id" value={course.id} />}
      <Field label="Course title">
        <Input name="name" required maxLength={150} defaultValue={course?.name} />
      </Field>
      <div className="form-grid">
        <Field label="Course code">
          <Input
            name="code"
            required
            pattern="[A-Z0-9\-]+"
            maxLength={20}
            defaultValue={course?.code}
          />
        </Field>
        <Field label="Credits">
          <Input
            type="number"
            name="credits"
            required
            min={1}
            max={12}
            defaultValue={course?.credits ?? 3}
          />
        </Field>
      </div>
      <Field label="Department">
        <Select name="departmentId" required defaultValue={course?.departmentId ?? ''}>
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <Textarea name="description" maxLength={1000} defaultValue={course?.description ?? ''} />
      </Field>
    </ActionForm>
  );
}
export function LecturerForm({
  departments,
  lecturer,
}: {
  departments: Option[];
  lecturer?: {
    id: string;
    name: string;
    email: string;
    qualification: string | null;
    departmentId: string;
  };
}) {
  return (
    <ActionForm
      action={saveLecturerAction}
      reset={!lecturer}
      label={lecturer ? 'Update lecturer' : 'Add lecturer'}
    >
      {lecturer && <input type="hidden" name="id" value={lecturer.id} />}
      <Field label="Full name">
        <Input name="name" required minLength={2} maxLength={120} defaultValue={lecturer?.name} />
      </Field>
      <Field label="Email address">
        <Input name="email" type="email" required maxLength={254} defaultValue={lecturer?.email} />
      </Field>
      <Field label="Department">
        <Select name="departmentId" required defaultValue={lecturer?.departmentId ?? ''}>
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Qualifications">
        <Input name="qualification" maxLength={200} defaultValue={lecturer?.qualification ?? ''} />
      </Field>
      <p className="muted text-xs leading-6">
        Employee IDs are generated automatically. An administrator provisions portal access with the
        account command.
      </p>
    </ActionForm>
  );
}
export function SectionForm({
  courses,
  lecturers,
  terms,
  rooms,
}: {
  courses: Option[];
  lecturers: Option[];
  terms: Option[];
  rooms: Option[];
}) {
  return (
    <ActionForm action={createSectionAction} label="Create class section">
      <Field label="Section code">
        <Input name="code" required maxLength={30} placeholder="CS101-A-2026" />
      </Field>
      {[
        { name: 'courseId', label: 'Course', items: courses },
        { name: 'lecturerId', label: 'Lecturer', items: lecturers },
        { name: 'semesterId', label: 'Academic term', items: terms },
        { name: 'classroomId', label: 'Classroom', items: rooms },
      ].map(({ name, label, items }) => (
        <Field label={label} key={name}>
          <Select name={name} required>
            <option value="">Select {label.toLowerCase()}</option>
            {items.map((i) => (
              <option value={i.id} key={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
      ))}
      <div className="form-grid">
        <Field label="Capacity">
          <Input name="capacity" type="number" min={1} max={500} required defaultValue={30} />
        </Field>
        <Field label="Weekday">
          <Select name="dayOfWeek" defaultValue="1">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
              (day, i) => (
                <option value={i} key={day}>
                  {day}
                </option>
              ),
            )}
          </Select>
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Start time">
          <Input name="startTime" type="time" required />
        </Field>
        <Field label="End time">
          <Input name="endTime" type="time" required />
        </Field>
      </div>
      <p className="muted text-xs leading-6">
        Times use Asia/Phnom_Penh. Room and lecturer conflicts are validated across overlapping
        academic terms.
      </p>
    </ActionForm>
  );
}
export function TermForm() {
  return (
    <ActionForm action={createTermAction} label="Create term">
      <Field label="Academic year">
        <Input name="year" required minLength={4} maxLength={30} placeholder="2026–2027" />
      </Field>
      <Field label="Term name">
        <Input name="name" required minLength={2} maxLength={80} placeholder="Semester 1" />
      </Field>
      <div className="form-grid">
        <Field label="Starts">
          <Input type="date" name="startsAt" required />
        </Field>
        <Field label="Ends">
          <Input type="date" name="endsAt" required />
        </Field>
      </div>
    </ActionForm>
  );
}
export function RoomForm() {
  return (
    <ActionForm action={createRoomAction} label="Create classroom">
      <Field label="Room name">
        <Input name="name" required minLength={2} maxLength={60} placeholder="Building A · 201" />
      </Field>
      <Field label="Capacity">
        <Input type="number" name="capacity" required min={1} max={500} />
      </Field>
    </ActionForm>
  );
}
