"use client";

/* V6 Pro "Hoy": KPI row (week earnings sparkline, jobs, rating, on-time),
   today's route map, new request cards with photo/price/distance +
   Accept/Decline, earnings by week, trust score ring. Seeded demo numbers are
   labelled "Demo"; the job lookup and payouts below are live. */

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, EmptyState, Field, Input, Skeleton } from "@/components/ui";
import { AreaTrend, BarCompare, ProgressRing, Sparkline } from "@/components/charts";
import { demoEarningsByWeek, demoEarningsWeek, demoKpis, demoRequests, demoRoute, demoTrust } from "@/lib/demo-dash";

const ProMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <Skeleton className="h-28" />,
});

interface JobRow {
  id: string;
  status: string;
  price_usd: number;
  pro_id: string;
  slot: string | null;
}

interface Payout {
  amount_usd: number;
  status: string;
}

export default function ProPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [lookup, setLookup] = useState("");
  const [available, setAvailable] = useState(true);
  const [decided, setDecided] = useState<Record<string, "accepted" | "declined">>({});
  const strings = t(lang);
  const demo = "Demo";

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/jobs");
        const json = (await res.json()) as { jobs?: JobRow[] };
        setJobs(res.ok ? json.jobs ?? [] : []);
      } catch {
        setJobs([]);
        /* list is a convenience; lookup by ID always works */
      }
      try {
        const pr = await fetch("/api/payouts");
        const pj = (await pr.json()) as { payouts?: Payout[] };
        if (pr.ok) setPayouts(pj.payouts ?? []);
      } catch {
        /* earnings optional */
      }
    })();
  }, []);

  const pending = payouts.filter((p) => p.status === "pending").reduce((a, b) => a + b.amount_usd, 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((a, b) => a + b.amount_usd, 0);
  const openRequests = demoRequests.filter((r) => !decided[r.id]);
  const kpi = lang === "es"
    ? { week: "Esta semana", jobs: "Trabajos", rating: "Calificación", onTime: "Puntual", route: "Ruta de hoy", requests: "Nuevas solicitudes", earnings: "Ingresos por semana", trust: "Confianza", accept: "Aceptar", decline: "Rechazar" }
    : { week: "This week", jobs: "Jobs", rating: "Rating", onTime: "On time", route: "Today's route", requests: "New requests", earnings: "Earnings by week", trust: "Trust", accept: "Accept", decline: "Decline" };

  return (
    <main>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.proTitle}</h1>
          <p className="mt-1 max-w-[60ch] text-[15px] text-slate2">{strings.proSub} · <span className="font-mono text-xs font-bold uppercase tracking-widest">{demo}</span></p>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          {strings.available}
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{kpi.week}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">${demoKpis.earningsWeek}</p>
          <Sparkline values={demoEarningsWeek} label={kpi.week} />
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{kpi.jobs}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">{demoKpis.jobsDone}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{kpi.rating}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">★ {demoKpis.rating}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{kpi.onTime}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">{Math.round(demoKpis.onTime * 100)}%</p>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold">{kpi.route}</h2>
          <div className="mt-2">
            <ProMap points={demoRoute.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: `${s.time} · ${s.label}` }))} />
          </div>
          <ol className="mt-2 space-y-1.5">
            {demoRoute.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs font-bold text-muted">{s.time}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-bold text-bg">{i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">{kpi.earnings}</h2>
          <div className="mt-2">
            <BarCompare values={demoEarningsByWeek.values} labels={demoEarningsByWeek.labels} label={kpi.earnings} />
          </div>
          <div className="mt-4 flex justify-center">
            <ProgressRing value={demoTrust.value} label={`${kpi.trust} · ${demoTrust.jobs} jobs`} />
          </div>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 font-display text-2xl font-bold">{kpi.requests} <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">{demo}</span></h2>
      {openRequests.length === 0 && <p className="text-sm text-muted">—</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {openRequests.map((r) => (
          <Card key={r.id} className="!p-0 overflow-hidden">
            <div className="relative aspect-[16/9] bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs font-bold text-white tabular-nums">${r.price}</span>
              <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs font-bold text-white tabular-nums">{r.distanceKm} km</span>
            </div>
            <div className="p-4">
              <strong className="block">{r.title}</strong>
              <div className="mt-2 flex gap-2">
                <Button size="md" className="flex-1" onPress={() => setDecided((d) => ({ ...d, [r.id]: "accepted" }))}>{kpi.accept}</Button>
                <Button size="md" variant="secondary" className="flex-1" onPress={() => setDecided((d) => ({ ...d, [r.id]: "declined" }))}>{kpi.decline}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 !border-trust">
        <div className="text-slate2 text-sm">{strings.earnings}</div>
        <div className="font-display text-3xl font-extrabold">${paid} <span className="text-base text-slate2">paid</span></div>
        <div className="text-sm">${pending} {strings.pendingPayout}</div>
        <div className="mt-2">
          <AreaTrend values={demoEarningsWeek} label={strings.earnings} format={(n) => `$${n}`} />
        </div>
        <Link className="text-sm underline" href="/pro/calendar">{strings.calTitle} →</Link>
      </Card>

      <Card className="mt-4">
        <Field label={strings.openJob}>
          <div className="flex gap-2">
            <Input
              aria-label={strings.openJob}
              placeholder={strings.lookupPh}
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
            />
            <Button isDisabled={!lookup.trim()} onPress={() => router.push(`/pro/jobs/${lookup.trim()}`)}>{strings.go}</Button>
          </div>
        </Field>
      </Card>

      {!jobs && <Skeleton className="h-24" />}
      {jobs?.map((j) => (
        <Link key={j.id} href={`/pro/jobs/${j.id}`} className="block no-underline">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <strong>{j.id.slice(0, 8)}…</strong>
              <Badge status={j.status} />
            </div>
            <div className="text-slate2 text-sm">${j.price_usd} · {j.slot ?? "—"}</div>
          </Card>
        </Link>
      ))}
      {jobs && jobs.length === 0 && <EmptyState title={strings.proTitle} hint={strings.proSub} />}
    </main>
  );
}
