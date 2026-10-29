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
  const [reason, setReason] = useState("");
  const [disputes, setDisputes] = useState<{ id: string; status: string; proposals: { id: string; kind: string; detail: string; amount_usd: number | null; status: string }[] }[]>([]);
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

  async function loadDisputes() {
    const res = await fetch(`/api/disputes?jobId=${encodeURIComponent(jobId)}`);
    const json = (await res.json()) as { disputes?: { id: string; status: string; proposals: { id: string; kind: string; detail: string; amount_usd: number | null; status: string }[] }[] };
    if (res.ok) setDisputes(json.disputes ?? []);
  }

  useEffect(() => {
    if (job && (job.status === "pending_verify" || job.status === "completed")) loadDisputes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  async function openDispute() {
    if (!reason.trim()) return;
    await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, reason }),
    });
    setReason("");
    await loadDisputes();
  }

  async function propose(disputeId: string) {
    await fetch("/api/disputes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputeId, jobId }),
    });
    await loadDisputes();
  }

  async function decide(disputeId: string, proposalId: string, accept: boolean) {    await fetch("/api/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputeId, jobId, proposalId, accept }),
    });
    await loadDisputes();
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
              {events.filter((e) => e.kind === "copilot_qa").map((e) => {
                const p = e.payload as { question?: string; answer?: string; safety_note?: string | null };
                return (
                  <div key={e.id} className="text-sm text-slate2">
                    <div>❓ {p.question}</div>
                    <div>🤖 {p.answer}</div>
                    {p.safety_note && <div className="warn">⚠ {p.safety_note}</div>}
                  </div>
                );
              })}
              {events.filter((e) => e.kind === "hazard").map((e) => {
                const p = e.payload as { warning?: string; hazards?: string[] };
                return (
                  <div key={e.id} className="warn text-sm" role="alert">
                    ⚠ {p.warning} <span className="pill">{strings.advisoryBadge}</span>
                  </div>
                );
              })}
              {events.filter((e) => e.kind === "step_evidence").map((e) => {
                const p = e.payload as { step?: string; photoDataUrl?: string };
                return (
                  <div key={e.id} className="text-sm text-slate2">
                    <div>📷 ✓ {p.step} <span className="pill">{strings.evidenceSaved}</span></div>
                    {p.photoDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoDataUrl} alt={p.step ?? "step evidence"} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4 }} />
                    )}
                  </div>
                );
              })}
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

        {(job.status === "pending_verify" || job.status === "completed") && (
          <Card>
            <h2 className="font-bold mb-2">{strings.dispute}</h2>
            {disputes.length === 0 && (
              <div className="flex gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={strings.disputeReason}
                  className="flex-1 border border-neutral-300 rounded-btn px-3 py-2"
                />
                <Button onClick={openDispute}>{strings.openDispute}</Button>
              </div>
            )}
            {disputes.map((d) => (
              <div key={d.id} className="mt-2 text-sm">
                <div className="text-slate2">{d.id.slice(0, 8)} · {d.status}</div>
                {d.proposals.length === 0 && (
                  <Button variant="secondary" onClick={() => propose(d.id)}>{strings.proposeResolution}</Button>
                )}
                {d.proposals.map((p) => (
                  <div key={p.id} className="rounded-card border border-neutral-200 p-2 mt-1">
                    <div><strong>{p.kind}</strong>: {p.detail}</div>
                    {p.amount_usd != null && <div>${p.amount_usd}</div>}
                    <div className="text-xs text-slate2">{p.status}</div>
                    {p.status === "pending" && (
                      <div className="flex gap-2 mt-1">
                        <Button variant="accent" onClick={() => decide(d.id, p.id, true)}>{strings.acceptProposal}</Button>
                        <Button variant="secondary" onClick={() => decide(d.id, p.id, false)}>✕</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        )}

        <p className="text-slate2 text-sm">{strings.heldNote}</p>
          <Link className="btn btn-secondary" href={`/quote/${(job as unknown as { scan_id?: string }).scan_id ?? ""}`}>
            ← {strings.quoteTitle}
          </Link>
        </>
      )}
    </main>
  );
}
