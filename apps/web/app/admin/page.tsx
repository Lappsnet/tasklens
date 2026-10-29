"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

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
      <h1>{strings.adminTitle}</h1>
      <p className="muted">{strings.adminSub} ({strings.roleLabel}: {role || "—"})</p>
      {role !== "admin" && (
        <p className="warn" role="alert">
          {strings.adminOnly} <Link href="/login">/login</Link>
        </p>
      )}
      <button type="button" className="btn big" disabled={busy || role !== "admin"} onClick={reset}>
        {busy ? "…" : strings.resetDemo}
      </button>
      {result && <p className="muted" role="status">{result}</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </main>
  );
}
