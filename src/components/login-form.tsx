'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validation';
import { loginAction } from '@/app/actions/auth';
import { Field } from './action-form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ArrowRight, LoaderCircle } from 'lucide-react';
export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const [error, setError] = useState(''),
    [pending, startTransition] = useTransition();
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit((data) => {
        const form = new FormData();
        Object.entries(data).forEach(([key, value]) => form.set(key, value));
        setError('');
        startTransition(async () => {
          const state = await loginAction({}, form);
          if (state.error) setError(state.error);
        });
      })}
    >
      <Field label="Email address">
        <Input
          type="email"
          autoComplete="username"
          placeholder="you@university.edu"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && <small className="field-error">{errors.email.message}</small>}
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          {...register('password')}
          aria-invalid={!!errors.password}
        />
        {errors.password && <small className="field-error">{errors.password.message}</small>}
      </Field>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending} type="submit">
        {pending ? <LoaderCircle size={16} className="animate-spin" /> : null}
        {pending ? 'Signing in…' : 'Sign in to your workspace'}
        {!pending && <ArrowRight size={15} />}
      </Button>
    </form>
  );
}
