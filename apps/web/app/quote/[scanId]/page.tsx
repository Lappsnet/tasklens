"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { AiSpec } from "@tasklens/ai";
import { t, type Lang } from "@/lib/i18n";

interface QuotePayload {
  scanId: string;
  spec: AiSpec;
  transcript: string;
  lang: Lang;
  mock?: boolean;
}

const URGENCY: Record<string, string> = {
  low: "#1a7f37",
  medium: "#9a6700",
  high: "#cf222e",
  emergency: "#82071e",
};

export default function QuotePage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [data, setData] = useState<QuotePayload | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
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
    load();
    try {
      setPhoto(window.sessionStorage.getItem(`tasklens:photo:${scanId}`));
    } catch {
      /* no local photo */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  if (error || (!data && error !== "")) {
    return (
      <main>
        <h1>{strings.quoteTitle}</h1>
        <p className="err" role="alert">{error || strings.errorGeneric}</p>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={load}>{strings.retry}</button>
          <Link className="btn" href="/scan">{strings.retake}</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main aria-busy="true">
        <h1>{strings.quoteTitle}</h1>
        <div className="card skel" />
        <div className="card skel" />
        <p className="muted">… {t(lang).working3}</p>
      </main>
    );
  }

  const { spec } = data;
  const [lo, hi] = spec.price_range_usd;
  const box = spec.damage_box;

  return (
    <main>
      <div className="row">
        <h1>{strings.quoteTitle}</h1>
        <span className="pill" style={{ background: URGENCY[spec.urgency] ?? "#666" }}>{spec.urgency}</span>
      </div>
      <p className="muted small">
        {spec.category} · {strings.estHours(spec.est_hours)} · {(spec.confidence * 100).toFixed(0)}% {strings.confidence}
      </p>

      {photo ? (
        <div className="photoview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="problem photo with AI damage highlight" />
          {box && (
            <div
              className="damagebox"
              style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
              aria-label="AI damage highlight"
            />
          )}
        </div>
      ) : (
        <div className="card"><p className="muted small">{strings.photoUnavailable}</p></div>
      )}

      <section className="card highlight">
        <div className="muted small">{spec.title}</div>
        <div className="price">${lo} – ${hi}</div>
        <p>{spec.diagnosis}</p>
      </section>

      {spec.confidence < 0.5 && (
        <p className="warn" role="alert">{strings.lowQ}</p>
      )}

      {spec.safety_flags.length > 0 && (
        <section className="card danger">
          <h2>⚠ {strings.safety}</h2>
          <ul>{spec.safety_flags.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      )}

      <section className="card">
        <h2>{strings.steps}</h2>
        <ol className="steps">{spec.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>

      <section className="card">
        <h2>{strings.materials}</h2>
        <div className="chips">{spec.materials.map((m) => <span key={m} className="chip">{m}</span>)}</div>
      </section>

      {spec.questions_for_customer.length > 0 && (
        <section className="card">
          <h2>{strings.questions}</h2>
          <ul>{spec.questions_for_customer.map((q) => <li key={q}>{q}</li>)}</ul>
        </section>
      )}

      <div className="row">
        <Link className="btn big" href={`/book/${scanId}`}>{strings.book}</Link>
        <Link className="btn btn-secondary" href="/scan">{strings.retake}</Link>
      </div>
    </main>
  );
}
