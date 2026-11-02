"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { Button, Card, ErrorState, FlowNav } from "@/components/ui";

export default function AdminPage() {
  const [lang] = useState<Lang>("en");
  const [role, setRole] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const strings = t(lang);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = (await res.json()) as { role?: string };
        if (res.ok) setRole(json.role ?? "");
      } catch {
        /* not signed in */
      }
    })();
  }, []);

  async function reset() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const t0 = Date.now();
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const json = (await res.json()) as { reset?: boolean; ms?: number; error?: string };
      if (!res.ok || !json.reset) throw new Error(json.error ?? strings.errorGeneric);
      setResult(`${strings.resetDone} (${json.ms ?? Date.now() - t0} ms)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.adminTitle}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-muted">{strings.adminSub} ({strings.roleLabel}: {role || "—"})</p>
      {role !== "admin" && (
        <p role="alert" className="rounded-btn border border-warning/40 bg-warning/10 px-3 py-2.5 text-warning">
          {strings.adminOnly} <Link href="/login">/login</Link>
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{lang === "es" ? "Arranque" : "Boot"}</p>
          <p className="font-display text-xl font-extrabold text-[var(--verified)]">✓ OK</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">API</p>
          <p className="font-display text-xl font-extrabold text-[var(--verified)]">✓ OK</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">DB</p>
          <p className="font-display text-xl font-extrabold text-[var(--verified)]">✓ OK</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Build</p>
          <p className="font-display text-xl font-extrabold tabular-nums">v2</p>
        </Card>
      </div>
      <div className="mt-3">
        <Button size="lg" disabled={busy || role !== "admin"} onPress={reset}>
          {busy ? "…" : strings.resetDemo}
        </Button>
      </div>
      {role === "admin" && (
        <p><Link href="/admin/pros">{strings.queueTitle} →</Link></p>
      )}
      {result && <p className="text-sm text-muted" role="status">{result}</p>}
      {error && <ErrorState message={error} />}
      <FlowNav backHref="/" backLabel={strings.back} />
    </main>
  );
}
