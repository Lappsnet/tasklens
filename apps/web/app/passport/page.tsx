"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [share, setShare] = useState("");
  const [pdf, setPdf] = useState("");
  const [error, setError] = useState("");
  const strings = t(lang);

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
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
      <h1>{strings.passportTitle}</h1>
      <p className="muted">{strings.passportSub}</p>
      {error && <p className="err" role="alert">{error}</p>}
      {!entries.length && !error && <div className="card skel" />}

      {entries.map((e) => (
        <section key={e.id} className="card">
          <div className="row">
            <strong>{e.title}</strong>
            <span className="pill">{e.category}</span>
          </div>
          <p className="muted small">{e.ai_summary}</p>
          <p className="muted small">{strings.warranty}: {daysLeft(e.warranty_until)}</p>
          <div className="row">
            <Link className="btn btn-secondary" href={`/jobs/${e.job_id}`}>{strings.watchTitle} →</Link>
            <button type="button" className="btn btn-secondary" onClick={() => rebook(e.id)}>{strings.rebook}</button>
          </div>
        </section>
      ))}

      {reminders.length > 0 && (
        <section className="card">
          <h2>{strings.reminders}</h2>
          <ul>{reminders.map((r) => <li key={r.id}>{r.title} — {r.due_on}</li>)}</ul>
        </section>
      )}

      <section className="card">
        <div className="row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              const res = await fetch("/api/passport/share", { method: "POST" });
              const json = (await res.json()) as { url?: string };
              if (res.ok && json.url) setShare(json.url);
            }}
          >
            {strings.sharePassport}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              const res = await fetch("/api/passport/export", { method: "POST" });
              const json = (await res.json()) as { sha256?: string };
              if (res.ok && json.sha256) setPdf(json.sha256);
            }}
          >
            {strings.exportPdf}
          </button>
        </div>
        {share && <p className="muted small" style={{ wordBreak: "break-all" }}>{share}</p>}
        {pdf && <p className="muted small">SHA-256: {pdf.slice(0, 32)}…</p>}
      </section>
    </main>
  );
}
