"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, EmptyState, ErrorState, FlowNav, Skeleton } from "@/components/ui";

interface Entry {
  id: string;
  job_id: string;
  category: string;
  title: string;
  warranty_until?: string;
  ai_summary: string;
}

interface Reminder {
  id: string;
  title: string;
  due_on: string;
}

function daysLeft(iso?: string): string {
  if (!iso) return "—";
  const d = Math.round((new Date(iso).getTime() - Date.now()) / 86400_000);
  return d < 0 ? "expired" : `${d}d`;
}

export default function PassportPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [share, setShare] = useState("");
  const [pdf, setPdf] = useState("");
  const [error, setError] = useState("");
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/passport");
      const json = (await res.json()) as { entries?: Entry[]; reminders?: Reminder[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setEntries(json.entries ?? []);
      setReminders(json.reminders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoaded(true);
    }
  }

  async function rebook(entryId: string) {
    const res = await fetch("/api/passport/warranty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    const json = (await res.json()) as { jobId?: string; error?: string };
    if (res.ok && json.jobId) window.location.href = `/book/${json.jobId}`;
    else setError(json.error ?? "rebook_failed");
  }

  return (
    <main>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.passportTitle}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-muted">{strings.passportSub}</p>
      {error && <ErrorState message={error} onRetry={() => { setError(""); load(); }} />}
      {!loaded && !error && <Skeleton className="h-48" />}
      {loaded && !error && entries.length === 0 && (
        <EmptyState
          title={strings.passportTitle}
          hint={strings.noJobsYet}
          action={<a className="inline-flex items-center justify-center gap-2 rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg" href="/scan">{strings.startScan}</a>}
        />
      )}

      {entries.map((e) => (
        <Card key={e.id}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <strong>{e.title}</strong>
            <Badge status={e.category} />
          </div>
          <p className="text-sm text-muted">{e.ai_summary}</p>
          <p className="text-sm text-muted">{strings.warranty}: {daysLeft(e.warranty_until)}</p>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <a className="inline-flex items-center justify-center gap-2 rounded-btn border border-ink bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-bg" href={`/jobs/${e.job_id}`}>{strings.watchTitle} →</a>
            <Button variant="secondary" onPress={() => rebook(e.id)}>{strings.rebook}</Button>
          </div>
        </Card>
      ))}

      {reminders.length > 0 && (
        <Card>
          <h2>{strings.reminders}</h2>
          <ul>{reminders.map((r) => <li key={r.id}>{r.title} — {r.due_on}</li>)}</ul>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="secondary"
            onPress={async () => {
              const res = await fetch("/api/passport/share", { method: "POST" });
              const json = (await res.json()) as { url?: string };
              if (res.ok && json.url) setShare(json.url);
            }}
          >
            {strings.sharePassport}
          </Button>
          <Button
            variant="secondary"
            onPress={async () => {
              const res = await fetch("/api/passport/export", { method: "POST" });
              const json = (await res.json()) as { sha256?: string };
              if (res.ok && json.sha256) setPdf(json.sha256);
            }}
          >
            {strings.exportPdf}
          </Button>
        </div>
        {share && <p className="text-sm text-muted" style={{ wordBreak: "break-all" }}>{share}</p>}
        {pdf && <p className="text-sm text-muted">SHA-256: {pdf.slice(0, 32)}…</p>}
      </Card>
      <FlowNav backHref="/" backLabel={strings.back} />
    </main>
  );
}
