export default function Home() {
  return (
    <main>
      <h1>TaskLens</h1>
      <p className="muted">Look at the problem. Speak. Book a pro. (Day 2: phone scan → AI quote is live.)</p>
      <p>
        <a className="btn" href="/scan">Start a scan</a>
      </p>
      <h2>Core loop</h2>
      <ol className="steps">
        <li>scan → quote</li>
        <li>match → book + hold payment</li>
        <li>pro accepts → job mode</li>
        <li>before/after photos → AI verification → release payment</li>
      </ol>
      <p className="muted">API day-1 check: <code>/api/health</code> should return ok.</p>
    </main>
  );
}
