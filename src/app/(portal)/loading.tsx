export default function Loading() {
  return (
    <div role="status" aria-label="Loading workspace" className="stack">
      <div className="skeleton h-10 w-60" />
      <div className="skeleton h-28" />
      <div className="metrics-grid">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton h-36" />
        ))}
      </div>
      <div className="skeleton h-80" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
