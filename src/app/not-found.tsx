import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty-state" id="main-content">
      <div className="eyebrow">ACADEMIA</div>
      <h1>This record isn’t available.</h1>
      <p>It may have moved, or your account may not have access.</p>
      <Link href="/dashboard" className="button button-primary mt-6">
        Back to overview
      </Link>
    </main>
  );
}
