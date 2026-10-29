"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { eventLabel, useJobFeed } from "@/lib/use-job";
import { Badge, Button, Card, EmptyState, Skeleton, Stepper, Timeline } from "@/components/ui";

/** Customer live view: status stepper + live timeline + rating. */
function StepTick({ payload }: { payload: { step: string; done: boolean } }) {
  return (
    <div className="text-sm text-slate2">
      {payload.done ? "✓ " : "○ "}
      {payload.step}
    </div>
  );
}

function Note({ payload }: { payload: unknown }) {
  if (typeof payload === "object" && payload !== null && "text" in payload) {
    return <div className="text-sm text-slate2">“{(payload as { text: string }).text}”</div>;
  }
  return null;
}

export default function WatchPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const strings = t(lang);
  const { job, events, live } = useJobFeed(jobId);
  const verified = events.find((e) => e.kind === "verified");
  const alreadyRated = events.some((e) => e.kind === "rated");

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  async function submitRating() {
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, stars, comment }),
    });
    if (res.ok) setRated(true);
  }

  return (
    <main>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold">{strings.watchTitle}</h1>
        <span className="pill">{live ? strings.liveBadge : strings.pollBadge}</span>
      </div>
      {!job && <Skeleton className="h-48" />}
      {job && (
        <>
          <Card className="!border-ink">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-display text-2xl font-extrabold capitalize">{job.status.replace("_", " ")}</div>
              <Badge status={job.status} />
            </div>
            <Stepper status={job.status} />
            <p className="text-slate2 text-sm">
              job {job.id.slice(0, 8)}… · ${job.price_usd} · {job.slot ?? "—"}
            </p>
            {job.status === "completed" ? (
              <p className="text-sm mt-1">✓ {strings.passed} ({job.payment?.status ?? "succeeded"})</p>
            ) : (
              <p className="text-slate2 text-sm mt-1">{strings.held} · {job.payment?.status ?? "requires_capture"}</p>
            )}
          </Card>
          {verified && (verified.payload as { verdict?: string }).verdict === "review" && (
            <p className="warn" role="alert">{strings.needsFix}</p>
          )}
          <Card>
            <h2 className="font-bold mb-2">{strings.logTitle}</h2>
            <Timeline
              events={events.map((e) => ({ ...e, payload: e.payload }))}
              label={eventLabel}
            />
            <div className="mt-2 space-y-1">
              {events.filter((e) => e.kind === "step").map((e) => (
                <StepTick key={e.id} payload={e.payload as unknown as { step: string; done: boolean }} />
              ))}
              {events.filter((e) => e.kind === "note").map((e) => (
                <Note key={e.id} payload={e.payload} />
              ))}
            </div>
            {events.length === 0 && <EmptyState title={strings.logTitle} />}
          </Card>
          {job.status === "completed" && !alreadyRated && !rated && (
            <Card className="!border-accent">
              <h2 className="font-bold mb-2">{strings.rateTitle}</h2>
              <div className="flex gap-1 text-3xl" role="radiogroup" aria-label={strings.rateTitle}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" aria-label={`${s}`} onClick={() => setStars(s)} className={s <= stars ? "text-accent" : "text-neutral-300"}>
                    ★
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={strings.rateHint} rows={2} maxLength={1000} />
              <Button variant="accent" onClick={submitRating}>{strings.rateSubmit}</Button>
            </Card>
          )}
          {(rated || alreadyRated) && <p className="text-sm text-trust font-bold">✓ {strings.ratedThanks}</p>}
          <p className="text-slate2 text-sm">{strings.heldNote}</p>
          <Link className="btn btn-secondary" href={`/quote/${(job as unknown as { scan_id?: string }).scan_id ?? ""}`}>
            ← {strings.quoteTitle}
          </Link>
        </>
      )}
    </main>
  );
}
