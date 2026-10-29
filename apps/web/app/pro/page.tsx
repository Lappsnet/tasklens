"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";

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
  const [error, setError] = useState("");
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/jobs");
        const json = (await res.json()) as { jobs?: JobRow[] };
        if (res.ok) setJobs(json.jobs ?? []);
      } catch {
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

  return (
    <main>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold">{strings.proTitle}</h1>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          {strings.available}
        </label>
      </div>
      <p className="text-slate2">{strings.proSub}</p>

      <Card className="!border-trust">
        <div className="text-slate2 text-sm">{strings.earnings}</div>
        <div className="font-display text-3xl font-extrabold">${paid} <span className="text-base text-slate2">paid</span></div>
        <div className="text-sm">${pending} {strings.pendingPayout}</div>
        <Link className="text-sm underline" href="/pro/calendar">{strings.calTitle} →</Link>
      </Card>

      <Card>
        <div className="flex gap-2">
          <input
            aria-label={strings.openJob}
            placeholder={strings.lookupPh}
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            className="flex-1 border border-neutral-300 rounded-btn px-3 py-2"
          />
          <Button disabled={!lookup.trim()} onClick={() => router.push(`/pro/jobs/${lookup.trim()}`)}>{strings.go}</Button>
        </div>
      </Card>

      {error && <p className="err" role="alert">{error}</p>}
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
