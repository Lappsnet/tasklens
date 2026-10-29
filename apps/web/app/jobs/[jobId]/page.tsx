"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { eventLabel, useJobFeed } from "@/lib/use-job";

/** Customer live view: watches the pro's progress as it happens. */
function StepTick({ payload }: { payload: { step: string; done: boolean } }) {
  return (
    <div className="muted">
      {payload.done ? "✓ " : "○ "}
      {payload.step}
    </div>
  );
}

export default function WatchPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const strings = t(lang);
  const { job, events, live } = useJobFeed(jobId);
  const verified = events.find((e) => e.kind === "verified");

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  return (
    <main>
      <div className="row">
        <h1>{strings.watchTitle}</h1>
        <span className="pill">{live ? strings.liveBadge : strings.pollBadge}</span>
      </div>
      {!job && <div className="card skel" />}
      {job && (
        <>
          <section className="card highlight">
            <div className="price">{job.status.replace("_", " ")}</div>
            <p className="muted small">
              job {job.id.slice(0, 8)}… · ${job.price_usd} · {job.slot ?? "—"}
            </p>
            {job.status === "completed" ? (
              <p className="muted small">✓ {strings.passed} ({job.payment?.status ?? "succeeded"})</p>
            ) : (
              <p className="muted small">
                {strings.held} · {job.payment?.status ?? "requires_capture"}
              </p>
            )}
          </section>
          {verified && (verified.payload as { verdict?: string }).verdict === "review" && (
            <p className="warn" role="alert">{strings.needsFix}</p>
          )}
          <section className="card">
            <h2>{strings.logTitle}</h2>
            <ol className="steps">
              {events.map((e) => (
                <li key={e.id}>
                  <strong>{eventLabel(e.kind)}</strong>
                  {e.kind === "note" && typeof e.payload === "object" && e.payload !== null && "text" in e.payload ? (
                    <div className="muted">“{(e.payload as { text: string }).text}”</div>
                  ) : null}
                  {e.kind === "step" && typeof e.payload === "object" && e.payload !== null && "step" in e.payload ? (
                    <StepTick payload={e.payload as unknown as { step: string; done: boolean }} />
                  ) : null}
                  <div className="muted small">{new Date(e.createdAt).toLocaleTimeString()}</div>
                </li>
              ))}
              {events.length === 0 && <li className="muted">—</li>}
            </ol>
          </section>
          <p className="muted small">{strings.heldNote}</p>
          <Link className="btn btn-secondary" href={`/quote/${(job as unknown as { scan_id?: string }).scan_id ?? ""}`}>
            ← {strings.quoteTitle}
          </Link>
        </>
      )}
    </main>
  );
}
