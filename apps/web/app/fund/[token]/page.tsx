"use client";

import { use, useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Button, Card, EmptyState, ErrorState, FlowNav, Skeleton } from "@/components/ui";

interface FundInfo {
  jobId: string;
  title: string;
  amountUsd: number;
  status: string;
  summary: string;
}

/** S5: a relative abroad funds the repair — sees title/price/summary only, never address/phone. */
export default function FundPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [info, setInfo] = useState<FundInfo | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      const res = await fetch(`/api/funding/${token}`);
      const json = (await res.json()) as FundInfo & { error?: string };
      if (res.ok) setInfo(json);
      else setError(json.error ?? "load_failed");
    })();
  }, [token]);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/funding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, payerEmail: email || undefined }),
      });
      const json = (await res.json()) as { error?: string; job?: unknown };
      if (!res.ok) throw new Error(json.error ?? "fund_failed");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fund_failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <main><ErrorState message={error} /></main>;
  if (!info) return <main><Skeleton className="h-48" /></main>;
  if (done) return <main><Card><p className="font-bold">✓ {strings.fundThanks}</p></Card></main>;

  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{info.title}</h1>
      <p className="text-slate2 text-sm">{info.summary}</p>
      <Card className="!border-ink">
        <div className="font-display text-4xl font-extrabold">${info.amountUsd}</div>
        <p className="text-slate2 text-sm">{strings.fundNote}</p>
      </Card>
      <Card>
        <label className="lbl" htmlFor="femail">{strings.emailLabel}</label>
        <input id="femail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }} />
        <Button variant="accent" className="mt-3" disabled={busy || !email} onClick={pay}>
          {busy ? "…" : `${strings.fundPay} $${info.amountUsd}`}
        </Button>
      </Card>
      <FlowNav backHref="/" backLabel={strings.back} />
    </main>
  );
}
