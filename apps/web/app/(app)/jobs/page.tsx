"use client";

/* U4 "Mis trabajos": ownership-filtered job list for customers and pros. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

interface Job {
  id: string;
  status: string;
  price_usd: number;
  slot: string | null;
}

export default function JobsPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/jobs");
        setJobs(res.ok ? ((await res.json()) as { jobs?: Job[] }).jobs ?? [] : []);
      } catch {
        setJobs([]);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold">{strings.myJobs}</h1>
      {!jobs && <Skeleton className="h-24" />}
      {jobs && jobs.length === 0 && <EmptyState title={strings.myJobs} hint={strings.noJobsYet} />}
      <div className="stagger">
        {(jobs ?? []).map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="block no-underline">
            <Card>
              <div className="flex items-center justify-between gap-2">
                <strong>job {j.id.slice(0, 8)}…</strong>
                <Badge status={j.status} />
              </div>
              <div className="mt-1 text-sm text-muted">${j.price_usd} · {j.slot ?? "—"}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
