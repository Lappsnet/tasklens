"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { eventLabel, useJobFeed } from "@/lib/use-job";

const NEXT_STEP: Record<string, { to: string; label: keyof ReturnType<typeof t> } | null> = {
  booked: { to: "en_route", label: "startRoute" },
  en_route: { to: "in_progress", label: "startWork" },
  in_progress: { to: "pending_verify", label: "submitVerify" },
  pending_verify: null,
};

export default function ProJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const strings = t(lang);
  const { job, events, live, error: feedError, reload } = useJobFeed(jobId);

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  async function advance(to: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, to }),
      });
      if (!res.ok) throw new Error(strings.errorGeneric);
      await reload();
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("jobId", jobId);
        fd.append("audio", new File([blob], "note.webm", { type: blob.type || "audio/webm" }));
        setBusy(true);
        try {
          await fetch("/api/jobs/note", { method: "POST", body: fd });
          await reload();
        } finally {
          setBusy(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError(strings.errorGeneric);
    }
  }

  async function onPhotos(list: FileList | null) {
    if (!list || list.length === 0) return;
    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("kind", "before");
    Array.from(list).slice(0, 3).forEach((f) => fd.append("photos", f, f.name));
    setBusy(true);
    try {
      const res = await fetch("/api/jobs/photos", { method: "POST", body: fd });
      if (!res.ok) throw new Error(strings.errorGeneric);
      await reload();
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  const step = job ? NEXT_STEP[job.status] : null;
  const doneSteps = new Set(
    events
      .filter((e) => e.kind === "step" && typeof e.payload === "object" && e.payload !== null && (e.payload as { done: boolean }).done)
      .map((e) => (e.payload as { step: string }).step),
  );

  // Load the repair-plan checklist from the scan spec (hands-free job mode).
  useEffect(() => {
    const scanId = (job as unknown as { scan_id?: string } | null)?.scan_id;
    if (!scanId) return;
    (async () => {
      try {
        const res = await fetch(`/api/scan?id=${encodeURIComponent(scanId)}`);
        const json = (await res.json()) as { spec?: { steps?: string[] } };
        if (res.ok && Array.isArray(json.spec?.steps)) setSteps(json.spec.steps as string[]);
      } catch {
        /* checklist is a convenience; buttons + notes still work */
      }
    })();
  }, [job]);

  async function tickStep(stepText: string, done: boolean) {
    try {
      await fetch("/api/jobs/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, step: stepText, done }),
      });
      await reload();
    } catch {
      setError(strings.errorGeneric);
    }
  }

  return (
    <main>
      <div className="row">
        <h1>{strings.jobMode}</h1>
        <span className="pill">{live ? strings.liveBadge : strings.pollBadge}</span>
      </div>
      {(error || feedError) && <p className="err" role="alert">{error || feedError}</p>}
      {!job && !feedError && <div className="card skel" />}

      {job && (
        <>
          <section className="card highlight">
            <div className="muted small">job {job.id.slice(0, 8)}… · ${job.price_usd} · {job.slot ?? "—"}</div>
            <div className="price">{job.status.replace("_", " ")}</div>
            {step && (
              <button type="button" className="btn big" disabled={busy} onClick={() => advance(step.to)}>
                {busy ? "…" : String(strings[step.label])}
              </button>
            )}
          </section>

          <section className="card">
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={toggleRecord}>
                {recording ? `● ${strings.stop}` : `🎙 ${strings.voiceNote}`}
              </button>
              <label className="btn btn-secondary filebtn">
                📷 {strings.beforePhotos}
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
              </label>
            </div>
          </section>

          <section className="card">
            <h2>{strings.logTitle}</h2>
            {steps.length > 0 && (
              <ol className="steps">
                {steps.map((s) => (
                  <li key={s}>
                    <label>
                      <input type="checkbox" checked={doneSteps.has(s)} onChange={(e) => tickStep(s, e.target.checked)} />{" "}
                      {doneSteps.has(s) ? <s>{s}</s> : s}
                    </label>
                  </li>
                ))}
              </ol>
            )}
            <ol className="steps">
              {events.map((e) => (
                <li key={e.id}>
                  <strong>{eventLabel(e.kind)}</strong>
                  {e.kind === "note" && typeof e.payload === "object" && e.payload !== null && "text" in e.payload ? (
                    <div className="muted">“{(e.payload as { text: string }).text}”</div>
                  ) : null}
                  {typeof e.kind === "string" && e.kind.startsWith("photo_") ? (
                    <div className="muted small">{JSON.stringify(e.payload)}</div>
                  ) : null}
                  <div className="muted small">{new Date(e.createdAt).toLocaleTimeString()}</div>
                </li>
              ))}
              {events.length === 0 && <li className="muted">—</li>}
            </ol>
          </section>

          <Link className="btn btn-secondary" href={`/jobs/${jobId}`}>{strings.watchTitle} →</Link>
        </>
      )}
    </main>
  );
}
