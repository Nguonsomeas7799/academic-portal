'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>We couldn’t load this workspace.</h1>
      <p>
        Please try again. If this continues, ask your administrator to check the database
        connection.
      </p>
      <Button onClick={reset} className="mt-5">
        Try again
      </Button>
    </div>
  );
}
