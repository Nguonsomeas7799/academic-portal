import { cn } from '@/lib/utils';
export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return <section className={cn('card', className)} {...props} />;
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'purple' | 'amber' | 'red' | 'neutral';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
