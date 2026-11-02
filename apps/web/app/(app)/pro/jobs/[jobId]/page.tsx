"use client";

import { use, useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { eventLabel, useJobFeed } from "@/lib/use-job";
import { toast, Badge, Button, Card, ErrorState, Field, FlowNav, Input, Skeleton } from "@/components/ui";

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
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.jobMode}</h1>
        <Badge status={live ? "live" : "polling"} />
      </div>
      {(error || feedError) && <ErrorState message={error || feedError || ""} />}
      {!job && !feedError && <Skeleton className="h-48" />}

      {job && (
        <>
          <Card className="border-signal shadow-lifted">
            <div className="text-sm text-muted">job {job.id.slice(0, 8)}… · ${job.price_usd} · {job.slot ?? "—"}</div>
            <div className="font-display text-3xl font-extrabold">{job.status.replace("_", " ")}</div>
            {currentStep && <p className="mt-2 font-display text-[32px] font-bold leading-tight">▶ {currentStep}</p>}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {step && (
                <Button size="lg" className="min-h-16 flex-1 text-lg" disabled={busy} onPress={() => advance(step.to)}>
                  {busy ? "…" : String(strings[step.label])}
                </Button>
              )}
              {currentStep && (
                <Button variant="secondary" onPress={speakStep} aria-label={strings.speakStep}>
                  🔊
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="secondary" onPress={toggleRecord}>
                {recording ? `● ${strings.stop}` : `🎙 ${strings.voiceNote}`}
              </Button>
              <Button variant="secondary" onPress={() => beforeRef.current?.click()}>
                📷 {strings.beforePhotos}
              </Button>
              <input ref={beforeRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
            </div>
          </Card>

          {(job.status === "in_progress" || job.status === "pending_verify" || job.status === "en_route") && (
            <Card className="border-signal shadow-lifted">
              <h2>{strings.copilotTitle}</h2>
              <p className="text-sm text-muted">{strings.copilotSub}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Field label={strings.askPh} className="min-w-40 flex-1">
                  <Input
                    value={copilotQ}
                    onChange={(e) => setCopilotQ(e.target.value)}
                    placeholder={strings.askPh}
                    maxLength={500}
                    aria-label={strings.askPh}
                  />
                </Field>
                <Button disabled={asking || !copilotQ.trim()} onPress={() => askCopilot(copilotQ)} className="self-end">
                  {asking ? "…" : strings.askButton}
                </Button>
                <Button variant="secondary" onPress={askByVoice} aria-label={strings.askVoice} className="self-end">
                  {recording ? `● ${strings.stop}` : `🎙 ${strings.askVoice}`}
                </Button>
              </div>
              {copilotA && (
                <div role="status">
                  <p>“{copilotA.answer}”</p>
                  {copilotA.safety_note && <p role="alert" className="rounded-btn border border-warning/40 bg-warning/10 px-3 py-2.5 text-warning">⚠ {copilotA.safety_note}</p>}
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    <Button variant="secondary" onPress={() => speak(copilotA.answer)}>
                      🔊 {strings.speakAnswer}
                    </Button>
                    <Badge status={strings.advisoryBadge} />
                    {copilotMock && <Badge status="mock" />}
                  </div>
                </div>
              )}
            </Card>
          )}

          {(job.status === "in_progress" || job.status === "pending_verify" || job.status === "en_route") && (
            <Card>
              <h2>{strings.hazardTitle}</h2>
              <p className="text-sm text-muted">{strings.hazardSub}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Field label={strings.framePh} className="min-w-40 flex-1">
                  <Input
                    value={frameNote}
                    onChange={(e) => setFrameNote(e.target.value)}
                    placeholder={strings.framePh}
                    maxLength={500}
                    aria-label={strings.framePh}
                  />
                </Field>
                <Button variant="secondary" onPress={() => checkHazards(frameNote)} className="self-end">
                  {strings.checkFrame}
                </Button>
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <Button variant="secondary" onPress={() => setWatchOn((v) => !v)} aria-pressed={watchOn}>
                  {watchOn ? strings.hazardOn : strings.hazardOff}
                </Button>
              </div>
              {hazard && (
                hazard.safe
                  ? <p className="text-sm text-muted" role="status">✓ {strings.hazardSafe}</p>
                  : <p role="alert" className="rounded-btn border border-warning/40 bg-warning/10 px-3 py-2.5 text-warning">⚠ {hazard.warning} <Badge status={strings.advisoryBadge} /></p>
              )}
            </Card>
          )}

          {(job.status === "in_progress" || job.status === "pending_verify") && (
            <Card className="border-signal shadow-lifted">
              <Field label={`📸 ${strings.afterPhotos}`}>
                <p className="text-sm text-muted">{strings.submitVerify}</p>
                <input
                  ref={afterRef}
                  id="after-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  hidden
                  disabled={busy}
                  onChange={(e) => onAfterPhotos(e.target.files)}
                />
              </Field>
              <Button size="lg" disabled={busy} onPress={() => afterRef.current?.click()} className="mt-2">
                {strings.submitVerify}
              </Button>
              {verdict && <p className="text-sm text-muted" role="status">{verdict}</p>}
            </Card>
          )}

          <Card>
            <h2>{strings.logTitle}</h2>
            {steps.length > 0 && (
              <ol className="mt-1 space-y-1.5">
                {steps.map((s, i) => (
                  <li key={s}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={doneSteps.has(s)} onChange={(e) => tickStep(s, e.target.checked)} />{" "}
                      {doneSteps.has(s) ? <s>{s}</s> : s}
                    </label>
                    {!doneSteps.has(s) && (
                      <Button variant="secondary" className="ml-2 mt-1 px-3 py-1.5 text-sm" onPress={() => document.getElementById(`ev-${i}`)?.click()}>
                        📷 {strings.listo}
                      </Button>
                    )}
                    <input id={`ev-${i}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => saveEvidence(s, e.target.files)} />
                  </li>
                ))}
              </ol>
            )}
            <ol className="mt-3 space-y-1.5">
              {events.map((e) => (
                <li key={e.id}>
                  <strong>{eventLabel(e.kind)}</strong>
                  {e.kind === "note" && typeof e.payload === "object" && e.payload !== null && "text" in e.payload ? (
                    <div className="text-sm text-muted">“{(e.payload as { text: string }).text}”</div>
                  ) : null}
                  {typeof e.kind === "string" && e.kind.startsWith("photo_") ? (
                    <div className="text-sm text-muted">{JSON.stringify(e.payload)}</div>
                  ) : null}
                  <div className="text-sm text-muted">{new Date(e.createdAt).toLocaleTimeString()}</div>
                </li>
              ))}
              {events.length === 0 && <li className="text-sm text-muted">—</li>}
            </ol>
          </Card>

          <a className="inline-flex items-center justify-center gap-2 rounded-btn border border-ink bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-bg" href={`/jobs/${jobId}`}>{strings.watchTitle} →</a>
          <FlowNav backHref="/pro" backLabel={strings.back} continueHref={`/jobs/${jobId}`} continueLabel={strings.watchTitle} />
        </>
      )}
    </main>
  );
}
