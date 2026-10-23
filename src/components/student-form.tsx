'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { studentSchema, type StudentInput } from '@/lib/validation';
import { saveStudentAction } from '@/app/actions/academic';
import { Field } from './action-form';
import { Button } from './ui/button';
import { Input, Select } from './ui/input';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
export function StudentForm({
  departments,
  student,
}: {
  departments: { id: string; name: string }[];
  student?: StudentInput & { id: string };
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: student?.firstName ?? '',
      lastName: student?.lastName ?? '',
      email: student?.email ?? '',
      phone: student?.phone ?? '',
      emergencyContact: student?.emergencyContact ?? '',
      departmentId: student?.departmentId ?? '',
      status: student?.status ?? 'ACTIVE',
    },
  });
  const [error, setError] = useState(''),
    [pending, startTransition] = useTransition();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit((data) => {
        const form = new FormData();
        if (student) form.set('id', student.id);
        Object.entries(data).forEach(([key, value]) => form.set(key, value));
        setError('');
        startTransition(async () => {
          const result = await saveStudentAction({}, form);
          if (result.error) setError(result.error);
          else {
            toast.success(result.success);
            router.push(student ? `/students/${student.id}` : '/students');
            router.refresh();
          }
        });
      })}
    >
      <div className="form-grid">
        <Field label="First name">
          <Input
            {...register('firstName')}
            aria-invalid={!!errors.firstName}
            autoComplete="given-name"
          />
          {errors.firstName && <small className="field-error">{errors.firstName.message}</small>}
        </Field>
        <Field label="Last name">
          <Input
            {...register('lastName')}
            aria-invalid={!!errors.lastName}
            autoComplete="family-name"
          />
          {errors.lastName && <small className="field-error">{errors.lastName.message}</small>}
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Email address">
          <Input
            type="email"
            {...register('email')}
            aria-invalid={!!errors.email}
            autoComplete="email"
          />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </Field>
        <Field label="Phone (optional)">
          <Input {...register('phone')} autoComplete="tel" maxLength={40} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Department">
          <Select {...register('departmentId')} aria-invalid={!!errors.departmentId}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          {errors.departmentId && (
            <small className="field-error">{errors.departmentId.message}</small>
          )}
        </Field>
        <Field label="Enrollment status">
          <Select {...register('status')}>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="GRADUATED">Graduated</option>
            {student && <option value="ARCHIVED">Archived</option>}
          </Select>
        </Field>
      </div>
      <Field
        label="Emergency contact (optional)"
        hint="Name and phone number of the person to contact in an emergency."
      >
        <Input {...register('emergencyContact')} maxLength={200} />
      </Field>
      <p className="muted text-xs leading-6">
        Student IDs are generated automatically. Portal accounts are provisioned separately by an
        administrator using the secure account command.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 border-t pt-5" style={{ borderColor: 'var(--line)' }}>
        <Button asChild variant="outline">
          <Link href={student ? `/students/${student.id}` : '/students'}>Cancel</Link>
        </Button>
        <Button disabled={pending || !departments.length} type="submit">
          {pending && <LoaderCircle size={15} className="animate-spin" />}
          {pending ? 'Saving…' : student ? 'Save student record' : 'Register student'}
        </Button>
      </div>
    </form>
  );
}
