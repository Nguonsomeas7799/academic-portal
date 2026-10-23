'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
export function Modal({
  trigger,
  title,
  description,
  children,
  wide = false,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
  }, [open]);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onClose={() => setOpen(false)}
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
            onClick={() => ref.current?.close()}
          >
            <X size={20} />
          </Button>
        </div>
        {open && children}
      </dialog>
    </>
  );
}
