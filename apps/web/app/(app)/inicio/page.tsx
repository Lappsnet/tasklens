"use client";

/* V6 Cliente home: greeting + big scan card with a real photo; active jobs
   with live steppers; upcoming appointments; passport reminders; spend chart.
   Numbers from seeded demo data are labelled "Demo". */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scan } from "@phosphor-icons/react";
import { Badge, Card, EmptyState, Skeleton, Stepper } from "@/components/ui";
import { AreaTrend } from "@/components/charts";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { demoSpendYear } from "@/lib/demo-dash";

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
  const demo = lang === "es" ? "Demo" : "Demo";
  const spendTitle = lang === "es" ? "Gasto este año" : "Spend this year";

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
      <section className="relative overflow-hidden rounded-card bg-[#0A1220] text-white shadow-lifted">
        <picture>
          <source srcSet="/images/showcase/grifo-cocina-danado.avif" type="image/avif" />
          <img
            src="/images/showcase/grifo-cocina-danado.webp"
            width={416}
            height={414}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" aria-hidden="true" />
        <div className="relative p-5 lg:p-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight lg:text-5xl">{strings.homeTitle}</h1>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-white/80">{strings.homeLead}</p>
          <Link href="/scan" className="mt-4 inline-flex items-center gap-2 rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
            <Scan size={20} weight="bold" aria-hidden="true" />
            {strings.startScan}
          </Link>
        </div>
      </section>

      <h2 className="mb-2 mt-6 font-display text-2xl font-bold">{strings.myJobs}</h2>
      {jobs === null && <><Skeleton className="h-24" /><Skeleton className="h-24" /></>}
      {jobs !== null && active.length === 0 && (
        <EmptyState title={strings.myJobs} hint={strings.noJobsYet} action={<Link href="/scan" className="rounded-btn bg-ink px-4 py-2 text-sm font-bold text-bg">{strings.startScan}</Link>} />
      )}
      <div className="stagger grid gap-3 lg:grid-cols-2">
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
          <h2 className="mb-2 mt-6 font-display text-2xl font-bold">{strings.upcomingTitle}</h2>
          {upcoming.map((j) => (
            <Card key={j.id}>
              <div className="text-sm"><strong>{j.slot}</strong> · job {j.id.slice(0, 8)}… · <Badge status={j.status} /></div>
            </Card>
          ))}
        </>
      )}

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">{strings.reminders}</h2>
            <span className="rounded-full bg-bg px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted">{demo}</span>
          </div>
          {pending.length === 0 && <p className="mt-2 text-sm text-muted">{strings.noJobsYet}</p>}
          {pending.map((r) => (
            <div key={r.id} className="mt-2 text-sm"><strong>{r.title}</strong> · <span className="text-muted">{r.due_on}</span></div>
          ))}
          <Link href="/passport" className="mt-3 inline-block text-sm font-bold underline">{strings.viewJob} →</Link>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">{spendTitle}</h2>
            <span className="rounded-full bg-bg px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted">{demo}</span>
          </div>
          <div className="mt-2">
            <AreaTrend values={demoSpendYear} label={spendTitle} format={(n) => `$${n}`} />
          </div>
        </Card>
      </div>
    </div>
  );
}
