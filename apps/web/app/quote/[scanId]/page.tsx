"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { AiSpec } from "@tasklens/ai";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, EmptyState, ErrorState, PriceRange, Skeleton } from "@/components/ui";

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
        <h1 className="font-display text-2xl font-bold">{strings.quoteTitle}</h1>
        <ErrorState message={error} onRetry={load} />
        <Link className="btn btn-secondary mt-3 inline-block" href="/scan">{strings.retake}</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main aria-busy="true">
        <h1 className="font-display text-2xl font-bold">{strings.quoteTitle}</h1>
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
        <h1 className="font-display text-2xl font-bold">{strings.quoteTitle}</h1>
        <Badge status={spec.urgency} />
      </div>
      <p className="text-slate2 text-sm">
        {spec.category} · {strings.estHours(spec.est_hours)} · {(spec.confidence * 100).toFixed(0)}% {strings.confidence}
      </p>

      {photo ? (
        <div className="photoview mask-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={showPreview && preview ? preview : photo} alt="problem photo with AI damage highlight" />
          {!showPreview && box && (
            <div
              className="damagebox"
              style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
              aria-label="AI damage highlight"
            />
          )}
          {!showPreview && sam && <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ boxShadow: "inset 0 0 0 3px #F26A1B", borderRadius: 12 }} />}
        </div>
      ) : (
        <Card><p className="text-slate2 text-sm">{strings.photoUnavailable}</p></Card>
      )}

      <Card className="!border-accent pop-in shadow-[0_2px_4px_rgba(15,27,45,0.06),0_16px_40px_-12px_rgba(242,106,27,0.4)]">
        <div className="text-slate2 text-sm">{spec.title}</div>
        <PriceRange lo={lo} hi={hi} />
        <p className="mt-2">{spec.diagnosis}</p>
        <Button variant="secondary" className="mt-2" onClick={togglePreview}>
          {strings.afterPreview}
        </Button>
        {showPreview && !preview && <p className="text-slate2 text-xs mt-1">{strings.previewNeedsKey}</p>}
      </Card>

      {spec.confidence < 0.5 && <p className="warn" role="alert">{strings.lowQ}</p>}

      {spec.safety_flags.length > 0 && (
        <Card className="!border-accent !bg-orange-50">
          <h2 className="font-bold">⚠ {strings.safety}</h2>
          <ul className="list-disc ml-5">{spec.safety_flags.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
      )}

      <Card>
        <h2 className="font-bold mb-2">{strings.steps}</h2>
        <ol className="steps">{spec.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{strings.materials}</h2>
        <div className="chips">{spec.materials.map((m) => <span key={m} className="chip">{m}</span>)}</div>
      </Card>

      {spec.questions_for_customer.length > 0 && (
        <Card>
          <h2 className="font-bold mb-2">{strings.questions}</h2>
          <ul className="list-disc ml-5">{spec.questions_for_customer.map((q) => <li key={q}>{q}</li>)}</ul>
        </Card>
      )}

      {spec.questions_for_customer.length === 0 && <EmptyState title={strings.questions} hint={strings.noQuestions} />}

      <div className="flex gap-2 flex-wrap mt-2">
        <Link className="btn btn-glow btn-sheen flex-1 text-center !bg-accent" href={`/book/${scanId}`}>{strings.book}</Link>
        <Link className="btn btn-secondary" href="/scan">{strings.retake}</Link>
      </div>
    </main>
  );
}
