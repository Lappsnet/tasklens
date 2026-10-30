"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { eventLabel, useJobFeed } from "@/lib/use-job";
import { toast } from "@/components/ui";

const NEXT_STEP: Record<string, { to: string; label: keyof ReturnType<typeof t> } | null> = {
  booked: { to: "en_route", label: "startRoute" },
  en_route: { to: "in_progress", label: "startWork" },
  // in_progress advances only via after-photo verification below; pending_verify resubmits the same way.
  in_progress: null,
  pending_verify: null,
};

export default function ProJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<string>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const strings = t(lang);
  const { job, events, live, error: feedError, reload } = useJobFeed(jobId);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
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

  async function onAfterPhotos(list: FileList | null) {
    if (!list || list.length === 0) return;
    const fd = new FormData();
    fd.append("jobId", jobId);
    Array.from(list).slice(0, 3).forEach((f) => fd.append("after", f, f.name));
    setBusy(true);
    setError("");
    setVerdict("");
    try {
      const res = await fetch("/api/jobs/verify", { method: "POST", body: fd });
      const json = (await res.json()) as { verdict?: { verdict: string; summary: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? strings.errorGeneric);
      setVerdict(`${json.verdict?.verdict}: ${json.verdict?.summary ?? ""}`);
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
  const currentStep = steps.find((s) => !doneSteps.has(s)) ?? steps[0];

  const [copilotQ, setCopilotQ] = useState("");
  const [copilotA, setCopilotA] = useState<{ answer: string; safety_note: string | null } | null>(null);
  const [copilotMock, setCopilotMock] = useState(false);
  const [asking, setAsking] = useState(false);
  const [frameNote, setFrameNote] = useState("");
  const [hazard, setHazard] = useState<{ safe: boolean; warning: string | null } | null>(null);
  const [watchOn, setWatchOn] = useState(false);
  const watchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameNoteRef = useRef("");
  frameNoteRef.current = frameNote;

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "es" ? "es-ES" : "en-US";
    window.speechSynthesis.speak(u);
  }

  function speakStep() {
    if (!currentStep) return;
    speak(`${job?.status.replace("_", " ")}. ${currentStep}`);
  }

  async function askCopilot(question: string) {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setError("");
    try {
      const res = await fetch("/api/copilot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, question: q, frameNote: frameNote || undefined, lang }),
      });
      const json = (await res.json()) as {
        answer?: { answer: string; safety_note: string | null };
        mock?: boolean;
        error?: string;
      };
      if (!res.ok || !json.answer) throw new Error(json.error ?? strings.errorGeneric);
      setCopilotA(json.answer);
      setCopilotMock(!!json.mock);
      speak(json.answer.safety_note ? `${json.answer.answer} ${json.answer.safety_note}` : json.answer.answer);
      await reload();
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setAsking(false);
    }
  }

  async function askByVoice() {
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
        fd.append("lang", lang);
        fd.append("audio", new File([blob], "question.webm", { type: blob.type || "audio/webm" }));
        setAsking(true);
        try {
          const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
          const tj = (await tr.json()) as { transcript?: string };
          if (tr.ok && tj.transcript) {
            setCopilotQ(tj.transcript);
            await askCopilot(tj.transcript);
          }
        } finally {
          setAsking(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError(strings.errorGeneric);
    }
  }

  async function checkHazards(note: string) {
    try {
      const res = await fetch("/api/copilot/hazard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, frameNote: note, lang }),
      });
      const json = (await res.json()) as { safe?: boolean; warning?: string | null; hazards?: string[] };
      if (!res.ok) return;
      setHazard({ safe: json.safe ?? true, warning: json.warning ?? null });
      if (json.safe === false && json.warning) {
        speak(json.warning);
        await reload();
      }
    } catch {
      /* hazard watch is advisory; failures stay silent */
    }
  }

  // Hazard watch: re-check the latest frame note every 60 s while enabled.
  useEffect(() => {
    if (!watchOn) {
      if (watchTimer.current) clearInterval(watchTimer.current);
      return;
    }
    watchTimer.current = setInterval(() => checkHazards(frameNoteRef.current), 60_000);
    return () => {
      if (watchTimer.current) clearInterval(watchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchOn, frameNote]);

  async function saveEvidence(stepText: string, list: FileList | null) {
    if (!list || list.length === 0) return;
    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("step", stepText);
    fd.append("photo", list[0], list[0].name);
    setBusy(true);
    try {
      const res = await fetch("/api/copilot/evidence", { method: "POST", body: fd });
      if (!res.ok) throw new Error(strings.errorGeneric);
      toast(strings.evidenceSaved);
      await reload();
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

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
            {currentStep && <p className="muted">▶ {currentStep}</p>}
            <div className="row">
              {step && (
                <button type="button" className="btn big" style={{ flex: 1 }} disabled={busy} onClick={() => advance(step.to)}>
                  {busy ? "…" : String(strings[step.label])}
                </button>
              )}
              {currentStep && (
                <button type="button" className="btn btn-secondary" onClick={speakStep} aria-label={strings.speakStep}>
                  🔊
                </button>
              )}
            </div>
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

          {(job.status === "in_progress" || job.status === "pending_verify" || job.status === "en_route") && (
            <section className="card highlight">
              <h2>{strings.copilotTitle}</h2>
              <p className="muted small">{strings.copilotSub}</p>
              <div className="row">
                <input
                  value={copilotQ}
                  onChange={(e) => setCopilotQ(e.target.value)}
                  placeholder={strings.askPh}
                  maxLength={500}
                  aria-label={strings.askPh}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn" disabled={asking || !copilotQ.trim()} onClick={() => askCopilot(copilotQ)}>
                  {asking ? "…" : strings.askButton}
                </button>
                <button type="button" className="btn btn-secondary" onClick={askByVoice} aria-label={strings.askVoice}>
                  {recording ? `● ${strings.stop}` : `🎙 ${strings.askVoice}`}
                </button>
              </div>
              {copilotA && (
                <div role="status">
                  <p>“{copilotA.answer}”</p>
                  {copilotA.safety_note && <p className="warn">⚠ {copilotA.safety_note}</p>}
                  <div className="row">
                    <button type="button" className="btn btn-secondary" onClick={() => speak(copilotA.answer)}>
                      🔊 {strings.speakAnswer}
                    </button>
                    <span className="pill">{strings.advisoryBadge}{copilotMock ? " · mock" : ""}</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {(job.status === "in_progress" || job.status === "pending_verify" || job.status === "en_route") && (
            <section className="card">
              <h2>{strings.hazardTitle}</h2>
              <p className="muted small">{strings.hazardSub}</p>
              <div className="row">
                <input
                  value={frameNote}
                  onChange={(e) => setFrameNote(e.target.value)}
                  placeholder={strings.framePh}
                  maxLength={500}
                  aria-label={strings.framePh}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-secondary" onClick={() => checkHazards(frameNote)}>
                  {strings.checkFrame}
                </button>
              </div>
              <div className="row">
                <button type="button" className="btn btn-secondary" onClick={() => setWatchOn((v) => !v)} aria-pressed={watchOn}>
                  {watchOn ? strings.hazardOn : strings.hazardOff}
                </button>
              </div>
              {hazard && (
                hazard.safe
                  ? <p className="muted" role="status">✓ {strings.hazardSafe}</p>
                  : <p className="warn" role="alert">⚠ {hazard.warning} <span className="pill">{strings.advisoryBadge}</span></p>
              )}
            </section>
          )}

          {(job.status === "in_progress" || job.status === "pending_verify") && (
            <section className="card highlight">
              <label className="lbl" htmlFor="after-input">📸 {strings.afterPhotos}</label>
              <p className="muted small">{strings.submitVerify}</p>
              <label className="btn big filebtn">
                {strings.submitVerify}
                <input
                  id="after-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  hidden
                  disabled={busy}
                  onChange={(e) => onAfterPhotos(e.target.files)}
                />
              </label>
              {verdict && <p className="muted" role="status">{verdict}</p>}
            </section>
          )}

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
                    {!doneSteps.has(s) && (
                      <label className="btn btn-secondary filebtn" style={{ marginLeft: 8 }}>
                        📷 {strings.listo}
                        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => saveEvidence(s, e.target.files)} />
                      </label>
                    )}
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
