"use client";

import { use, useEffect, useState } from "react";
import type { AiSpec } from "@tasklens/ai";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, EmptyState, ErrorState, FlowNav, PriceRange, Skeleton } from "@/components/ui";

interface QuotePayload {
  scanId: string;
  spec: AiSpec;
  transcript: string;
  lang: Lang;
  mock?: boolean;
}

export default function QuotePage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [data, setData] = useState<QuotePayload | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sam, setSam] = useState<number[][][] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const strings = t(lang);

  async function load() {
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/scan?id=${encodeURIComponent(scanId)}`);
      const json = (await res.json()) as QuotePayload & { error?: string };
      if (!res.ok) throw new Error("not_found");
      setData(json);
      setLang(json.lang === "es" ? "es" : "en");
    } catch {
      setError(strings.errorGeneric);
    }
  }

  useEffect(() => {
    const saved = initialLang();
    if (saved) setLang(saved);
    load();
    try {
      setPhoto(window.sessionStorage.getItem(`tasklens:photo:${scanId}`));
    } catch {
      /* no local photo */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  // SAM highlight (best-effort) + after-preview toggle, both need the local photo.
  async function togglePreview() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    setShowPreview(true);
    if (preview || !photo) return;
    try {
      const fd = new FormData();
      fd.append("scanId", scanId);
      const blob = await (await fetch(photo)).blob();
      fd.append("photo", new File([blob], "scan.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/jobs/preview", { method: "POST", body: fd });
      const json = (await res.json()) as { preview?: string };
      if (res.ok && json.preview) setPreview(json.preview);
    } catch {
      /* preview stays unavailable */
    }
  }

  useEffect(() => {
    if (!photo || !data) return;
    (async () => {
      try {
        const fd = new FormData();
        fd.append("scanId", scanId);
        const res = await fetch("/api/scan/highlight", { method: "POST", body: fd });
        const json = (await res.json()) as { mask?: number[][][] };
        if (res.ok && json.mask) setSam(json.mask);
      } catch {
        /* damage_box fallback below */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, data?.scanId]);

  if (error) {
    return (
      <main>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.quoteTitle}</h1>
        <ErrorState message={error} onRetry={load} />
        <a className="mt-3 inline-flex items-center justify-center gap-2 rounded-btn border border-ink bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-bg" href="/scan">{strings.retake}</a>
      </main>
    );
  }

  if (!data) {
    return (
      <main aria-busy="true">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.quoteTitle}</h1>
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <p className="text-slate2 text-sm">… {strings.working3}</p>
      </main>
    );
  }

  const { spec } = data;
  const [lo, hi] = spec.price_range_usd;
  const box = spec.damage_box;

  return (
    <main className="stagger">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.quoteTitle}</h1>
        <Badge status={spec.urgency} />
      </div>
      <p className="mt-1 max-w-[60ch] text-[15px] text-slate2">
        {spec.category} · {strings.estHours(spec.est_hours)} · {(spec.confidence * 100).toFixed(0)}% {strings.confidence}
      </p>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-4">
          {photo ? (
            <div className="mask-in relative overflow-hidden rounded-card border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={showPreview && preview ? preview : photo} alt="problem photo with AI damage highlight" className="block w-full" />
              {!showPreview && box && (
                <div
                  className="pointer-events-none absolute rounded-md border-[3px] border-[#ff4d4f] shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
                  style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
                  aria-label="AI damage highlight"
                />
              )}
              {!showPreview && sam && <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ boxShadow: "inset 0 0 0 3px #F26A1B", borderRadius: 12 }} />}
            </div>
          ) : (
            <Card><p className="text-slate2 text-sm">{strings.photoUnavailable}</p></Card>
          )}

          <Card>
            <h2 className="font-bold mb-3">{strings.steps}</h2>
            <ol className="relative space-y-3 border-l-2 border-line pl-5">
              {spec.steps.map((s, i) => (
                <li key={s} className="relative">
                  <span aria-hidden="true" className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-bold text-bg">
                    {i + 1}
                  </span>
                  <p className="text-[15px] leading-relaxed">{s}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="font-bold mb-2">{strings.materials}</h2>
            <div className="flex flex-wrap gap-2">{spec.materials.map((m) => <Badge key={m} status={m} />)}</div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <Card className="!border-accent pop-in shadow-[0_2px_4px_rgba(15,27,45,0.06),0_16px_40px_-12px_rgba(242,106,27,0.4)]">
            <div className="flex items-start justify-between gap-3">
              <div className="text-slate2 text-sm">{spec.title}</div>
              <span
                role="img"
                aria-label={`${(spec.confidence * 100).toFixed(0)}% ${strings.confidence}`}
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
                style={{ background: `conic-gradient(var(--signal) ${(spec.confidence * 100).toFixed(0)}%, var(--line) 0)` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                  {(spec.confidence * 100).toFixed(0)}
                </span>
              </span>
            </div>
            <PriceRange lo={lo} hi={hi} />
            <p className="mt-2">{spec.diagnosis}</p>
            <Button variant="secondary" className="mt-2" onClick={togglePreview}>
              {strings.afterPreview}
            </Button>
            {showPreview && !preview && <p className="text-slate2 text-xs mt-1">{strings.previewNeedsKey}</p>}
            <Button size="lg" variant="accent" className="mt-3 w-full" onClick={() => { window.location.href = `/book/${scanId}`; }}>
              {strings.book}
            </Button>
          </Card>

          {spec.confidence < 0.5 && <p role="alert" className="rounded-btn border border-warning/40 bg-warning/10 px-3 py-2.5 text-warning">{strings.lowQ}</p>}

          {spec.safety_flags.length > 0 && (
            <Card className="!border-accent !bg-orange-50">
              <h2 className="font-bold">⚠ {strings.safety}</h2>
              <ul className="list-disc ml-5">{spec.safety_flags.map((s) => <li key={s}>{s}</li>)}</ul>
            </Card>
          )}

          {spec.questions_for_customer.length > 0 && (
            <Card>
              <h2 className="font-bold mb-2">{strings.questions}</h2>
              <ul className="list-disc ml-5">{spec.questions_for_customer.map((q) => <li key={q}>{q}</li>)}</ul>
            </Card>
          )}

          {spec.questions_for_customer.length === 0 && <EmptyState title={strings.questions} hint={strings.noQuestions} />}
        </div>
      </div>

      <FlowNav backHref="/scan" backLabel={strings.back} continueHref={`/book/${scanId}`} continueLabel={strings.book} />
    </main>
  );
}
