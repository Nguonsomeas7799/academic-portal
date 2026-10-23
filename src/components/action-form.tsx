'use client';
import {
  useActionState,
  useEffect,
  useRef,
  useId,
  startTransition,
  Children,
  isValidElement,
  cloneElement,
} from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import type { ActionState } from '@/lib/validation';
import { LoaderCircle } from 'lucide-react';
export type FormAction = (state: ActionState, data: FormData) => Promise<ActionState>;
export function ActionForm({
  action,
  children,
  label = 'Save changes',
  reset = true,
  confirm,
  className,
  variant = 'default',
}: {
  action: FormAction;
  children?: React.ReactNode;
  label?: string;
  reset?: boolean;
  confirm?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'destructive';
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const messageId = useId();
  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      if (reset) ref.current?.reset();
    }
  }, [state, reset]);
  return (
    <form
      ref={ref}
      action={dispatch}
      className={className ?? 'form-stack'}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const data = new FormData(e.currentTarget);
        startTransition(() => dispatch(data));
      }}
      aria-describedby={state.error ? messageId : undefined}
    >
      {children}
      {state.error && (
        <p id={messageId} role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending && <LoaderCircle size={16} className="animate-spin" />}
        {pending ? 'Saving…' : label}
      </Button>
    </form>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child, index) =>
        index === 0 && isValidElement<{ id?: string; 'aria-describedby'?: string }>(child)
          ? cloneElement(child, { id, 'aria-describedby': hint ? `${id}-hint` : undefined })
          : child,
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
