"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_FILE = 10 * 1024 * 1024;

type Phase = "idle" | "working" | "error";

export default function ScanPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepMsg, setStepMsg] = useState(0);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceRef = useRef<Blob | null>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function pickLang(l: Lang) {
    setLang(l);
    window.localStorage.setItem("tasklens:lang", l);
  }

  function onFiles(list: FileList | null) {
    setError("");
    if (!list) return;
    const next: File[] = [...photos];
    for (const f of Array.from(list).slice(0, 3 - next.length)) {
      if (!ACCEPT.split(",").includes(f.type) || f.size > MAX_FILE || f.size === 0) {
        setError(strings.errorPhotos);
        continue;
      }
      next.push(f);
    }
    setPhotos(next.slice(0, 3));
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        voiceRef.current = blob;
        // Transcribe immediately so the user sees text before submitting.
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", new File([blob], "note.webm", { type: blob.type }), "note.webm");
          fd.append("lang", lang);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const json = (await res.json()) as { transcript?: string; error?: string };
          if (!res.ok || !json.transcript) throw new Error(json.error ?? "transcribe_failed");
          setTranscript(json.transcript);
        } catch {
          // Keep the recording: /api/scan will transcribe server-side as fallback.
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError(strings.errorGeneric);
    }
  }

  async function submit() {
    setError("");
    if (photos.length === 0) {
      setError(strings.errorPhotos);
      return;
    }
    setPhase("working");
    setStepMsg(0);
    const timers = [
      setTimeout(() => setStepMsg(1), 1200),
      setTimeout(() => setStepMsg(2), 2600),
    ];
    const started = Date.now();
    try {
      const fd = new FormData();
      photos.forEach((p) => fd.append("photos", p, p.name));
      fd.append("transcript", transcript);
      fd.append("lang", lang);
      if (!transcript.trim() && voiceRef.current) {
        fd.append(
          "audio",
          new File([voiceRef.current], "note.webm", { type: voiceRef.current.type || "audio/webm" }),
        );
      }
      const res = await fetch("/api/scan", { method: "POST", body: fd });
      const json = (await res.json()) as { scanId?: string; error?: string };
      if (!res.ok || !json.scanId) {
        throw new Error(json.error === "need_photo" || json.error === "bad_photo" ? strings.errorPhotos : strings.errorGeneric);
      }
      // Persist first photo locally for the damage-box overlay on the quote screen.
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(photos[0]);
        });
        window.sessionStorage.setItem(`tasklens:photo:${json.scanId}`, dataUrl);
      } catch {
        /* overlay falls back to a placeholder */
      }
      const elapsed = Date.now() - started;
      console.info(`[scan] quote in ${elapsed}ms`);
      router.push(`/quote/${json.scanId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
      setPhase("error");
    } finally {
      timers.forEach(clearTimeout);
      if (phase !== "error") setPhase("idle");
    }
  }

  const working = phase === "working";
  const steps = [strings.working1, strings.working2, strings.working3];

  return (
    <main>
      <div className="row">
        <h1>{strings.scanTitle}</h1>
        <div className="seg" role="group" aria-label={strings.langLabel}>
          {(["en", "es"] as Lang[]).map((l) => (
            <button key={l} type="button" className={l === lang ? "on" : ""} onClick={() => pickLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className="muted">{strings.scanSub}</p>

      <section className="card">
        <label className="lbl" htmlFor="photo-input">{strings.photoLabel}</label>
        <p className="muted small">{strings.photoHint}</p>
        <label className="btn btn-secondary filebtn">
          {strings.takePhoto}
          <input
            id="photo-input"
            type="file"
            accept={ACCEPT}
            capture="environment"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
        {previews.length > 0 && (
          <div className="thumbs">
            {previews.map((u, i) => (
              <div key={u} className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`scan photo ${i + 1}`} />
                {i === 0 && <span className="badge">main</span>}
                <button
                  type="button"
                  aria-label={`remove photo ${i + 1}`}
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <label className="lbl" htmlFor="transcript">{strings.transcriptLabel}</label>
        <textarea
          id="transcript"
          rows={3}
          placeholder={strings.transcriptPh}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          maxLength={2000}
        />
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={toggleRecord}>
            {recording ? `● ${strings.stop}` : `🎙 ${strings.record}`}
          </button>
          {(transcribing || recording) && <span className="muted small">{strings.transcribing}</span>}
        </div>
      </section>

      {error && (
        <p className="err" role="alert">
          {error}{" "}
          <button type="button" className="link" onClick={() => { setError(""); setPhase("idle"); }}>
            {strings.retry}
          </button>
        </p>
      )}

      <button type="button" className="btn big" disabled={working || photos.length === 0} onClick={submit}>
        {working ? `${steps[stepMsg]}…` : strings.submit}
      </button>
      {working && (
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s} className={i <= stepMsg ? "" : "muted"}>{i < stepMsg ? `✓ ${s}` : i === stepMsg ? `… ${s}` : s}</li>
          ))}
        </ol>
      )}
    </main>
  );
}
