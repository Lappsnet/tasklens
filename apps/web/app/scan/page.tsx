export default function ScanPage() {
  return (
    <main>
      <h1>Scan (Day 2)</h1>
      <p className="muted">Phone camera + voice capture lands Day 2. Day 1: use the CLI.</p>
      <pre className="card">pnpm --filter @tasklens/ai cli -- --mock</pre>
    </main>
  );
}
