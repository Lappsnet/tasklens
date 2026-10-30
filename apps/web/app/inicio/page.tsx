"use client";

/* U4 Cliente home: scan hero, active jobs with live steppers, upcoming
   appointments, passport reminders. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scan } from "@phosphor-icons/react";
import { Badge, Card, EmptyState, Skeleton, Stepper } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

interface Job {
  id: string;
  status: string;
  price_usd: number;
  slot: string | null;
  scan_id?: string;
}

interface Reminder {
  id: string;
  title: string;
  due_on: string;
  done: boolean;
}

export default function InicioPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) setJobs(((await res.json()) as { jobs?: Job[] }).jobs ?? []);
        else setJobs([]);
      } catch {
        setJobs([]);
      }
      try {
        const res = await fetch("/api/passport");
        if (res.ok) setReminders(((await res.json()) as { reminders?: Reminder[] }).reminders ?? []);
        else setReminders([]);
      } catch {
        setReminders([]);
      }
    })();
  }, []);

  const active = (jobs ?? []).filter((j) => !["completed", "disputed"].includes(j.status));
  const upcoming = (jobs ?? []).filter((j) => j.slot && ["booked", "en_route"].includes(j.status)).slice(0, 3);
  const pending = (reminders ?? []).filter((r) => !r.done).slice(0, 3);

  return (
    <div>
      <section className="rounded-card grad-pan p-5 text-white bg-[linear-gradient(135deg,#16263f,#0f1b2d_45%,#3a1c07)] shadow-lifted">
        <h1 className="font-display text-2xl font-extrabold">{strings.homeTitle}</h1>
        <p className="mt-1 text-sm text-white/80">{strings.homeLead}</p>
        <Link href="/scan" className="btn-glow btn-sheen mt-4 inline-flex items-center gap-2 rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
          <Scan size={20} weight="bold" aria-hidden="true" />
          {strings.startScan}
        </Link>
      </section>

      <h2 className="mb-2 mt-5 font-display text-lg font-bold">{strings.myJobs}</h2>
      {jobs === null && <Skeleton className="h-24" />}
      {jobs !== null && active.length === 0 && (
        <EmptyState title={strings.myJobs} hint={strings.noJobsYet} action={<Link href="/scan" className="rounded-btn bg-ink px-4 py-2 text-sm font-bold text-bg">{strings.startScan}</Link>} />
      )}
      <div className="stagger">
        {active.map((j) => (
          <Card key={j.id}>
            <div className="flex items-center justify-between gap-2">
              <strong>job {j.id.slice(0, 8)}…</strong>
              <Badge status={j.status} />
            </div>
            <Stepper status={j.status} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">${j.price_usd} · {j.slot ?? "—"}</span>
              <Link href={`/jobs/${j.id}`} className="text-sm font-bold underline">{strings.viewJob}</Link>
            </div>
          </Card>
        ))}
      </div>

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-2 mt-5 font-display text-lg font-bold">{strings.upcomingTitle}</h2>
          {upcoming.map((j) => (
            <Card key={j.id}>
              <div className="text-sm"><strong>{j.slot}</strong> · job {j.id.slice(0, 8)}… · <Badge status={j.status} /></div>
            </Card>
          ))}
        </>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="mb-2 mt-5 font-display text-lg font-bold">{strings.reminders}</h2>
          {pending.map((r) => (
            <Card key={r.id}>
              <div className="text-sm"><strong>{r.title}</strong> · <span className="text-muted">{r.due_on}</span></div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
