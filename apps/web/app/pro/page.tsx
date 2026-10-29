"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

interface JobRow {
  id: string;
  status: string;
  price_usd: number;
  pro_id: string;
  slot: string | null;
}

export default function ProPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [lookup, setLookup] = useState("");
  const [error, setError] = useState("");
  const strings = t(lang);

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/jobs");
        const json = (await res.json()) as { jobs?: JobRow[] };
        if (res.ok) setJobs(json.jobs ?? []);
      } catch {
        /* list is a convenience; lookup by ID always works */
      }
    })();
  }, []);

  return (
    <main>
      <h1>{strings.proTitle}</h1>
      <p className="muted">{strings.proSub}</p>

      <section className="card">
        <div className="row">
          <input
            aria-label={strings.openJob}
            placeholder={strings.lookupPh}
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            style={{ flex: 1, border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }}
          />
          <button
            type="button"
            className="btn"
            disabled={!lookup.trim()}
            onClick={() => router.push(`/pro/jobs/${lookup.trim()}`)}
          >
            {strings.go}
          </button>
        </div>
      </section>

      {error && <p className="err" role="alert">{error}</p>}

      {!jobs && <div className="card skel" />}
      {jobs?.map((j) => (
        <Link key={j.id} href={`/pro/jobs/${j.id}`} className="card" style={{ display: "block", textDecoration: "none" }}>
          <div className="row">
            <strong>{j.id.slice(0, 8)}…</strong>
            <span className="pill">{j.status}</span>
          </div>
          <div className="muted small">${j.price_usd} · {j.slot ?? "—"}</div>
        </Link>
      ))}
      {jobs && jobs.length === 0 && <p className="muted">{strings.proSub}</p>}
    </main>
  );
}
