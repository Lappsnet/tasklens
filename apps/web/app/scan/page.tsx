"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Button, CameraFrame, Card, ErrorState, Skeleton } from "@/components/ui";

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
  const [noCamera, setNoCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceRef = useRef<Blob | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setNoCamera(true);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function pickLang(l: Lang) {
    setLang(l);
    try {
      window.localStorage.setItem("tasklens:lang", l);
      document.cookie = `tasklens:lang=${l}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
  }

  function onFiles(list: FileList | null) {
    setError("");
    if (!list) return;
    const next = [...photos];
    for (const f of Array.from(list).slice(0, 3 - next.length)) {
      if (!ACCEPT.split(",").includes(f.type) || f.size > MAX_FILE || f.size === 0) {
        setError(strings.errorPhotos);
        continue;
      }
      next.push(f);
    }
    setPhotos(next.slice(0, 3));
  }

  function shutter() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError(strings.errorPhotos);
      return;
    }
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")?.drawImage(video, 0, 0);
    c.toBlob((b) => {
      if (!b) {
        setError(strings.errorGeneric);
        return;
      }
      setPhotos((p) => [...p, new File([b], `live-${Date.now()}.jpg`, { type: "image/jpeg" })].slice(0, 3));
    }, "image/jpeg", 0.9);
  }

  function useDemoPhoto() {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 480;
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, 640, 480);
    g.fillStyle = "#8a5a33"; g.fillRect(120, 300, 400, 180);
    g.fillStyle = "#5b3a1e"; g.fillRect(120, 300, 400, 14);
    g.fillStyle = "#9aa3a8";
    g.fillRect(290, 40, 26, 180); g.fillRect(290, 220, 120, 26); g.fillRect(384, 150, 26, 96);
    g.beginPath(); g.arc(303, 246, 34, 0, Math.PI); g.fill();
    g.fillStyle = "#2f9e44"; g.beginPath(); g.arc(320, 130, 10, 0, 7); g.fill();
    g.fillStyle = "#1c7ed6";
    g.beginPath(); g.ellipse(303, 300, 9, 13, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(303, 330, 42, 12, 0, 0, 7); g.fill();
    c.toBlob((b) => {
      if (b) setPhotos((p) => [...p, new File([b], "demo-leak.png", { type: "image/png" })].slice(0, 3));
    }, "image/png");
  }

  function drawWave() {
    const canvas = waveRef.current;
    const an = analyserRef.current;
    if (!canvas || !an) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => {
      if (!analyserRef.current) return;
      an.getByteFrequencyData(data);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = "#F26A1B";
      const n = 24;
      for (let i = 0; i < n; i++) {
        const v = data[Math.floor((i / n) * data.length)] / 255;
        const h = 4 + v * (canvas.height - 8);
        g.fillRect(i * (canvas.width / n), (canvas.height - h) / 2, canvas.width / n - 2, h);
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      src.connect(an);
      analyserRef.current = an;
      drawWave();
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        analyserRef.current = null;
        ctx.close().catch(() => undefined);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        voiceRef.current = blob;
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
          /* server transcribes as fallback */
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
    const timers = [setTimeout(() => setStepMsg(1), 1200), setTimeout(() => setStepMsg(2), 2600), setTimeout(() => setStepMsg(3), 4200)];
    const started = Date.now();
    try {
      const fd = new FormData();
      photos.forEach((p) => fd.append("photos", p, p.name));
      fd.append("transcript", transcript);
      fd.append("lang", lang);
      if (!transcript.trim() && voiceRef.current) {
        fd.append("audio", new File([voiceRef.current], "note.webm", { type: voiceRef.current.type || "audio/webm" }));
      }
      const res = await fetch("/api/scan", { method: "POST", body: fd });
      const json = (await res.json()) as { scanId?: string; error?: string };
      if (!res.ok || !json.scanId) {
        throw new Error(json.error === "need_photo" || json.error === "bad_photo" ? strings.errorPhotos : strings.errorGeneric);
      }
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
      console.info(`[scan] quote in ${Date.now() - started}ms`);
      router.push(`/quote/${json.scanId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
      setPhase("error");
    } finally {
      timers.forEach(clearTimeout);
      setPhase("idle");
    }
  }

  const working = phase === "working";
  const steps = [strings.working1, strings.working2, strings.working3, strings.findingPros];

  return (
    <main>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-3xl font-bold">{strings.scanTitle}</h1>
        <div className="seg" role="group" aria-label={strings.langLabel}>
          {(["en", "es"] as Lang[]).map((l) => (
            <button key={l} type="button" className={l === lang ? "on" : ""} onClick={() => pickLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className="text-slate2">{strings.scanSub}</p>

      <CameraFrame scanning={working}>
        {!noCamera ? (
          <video ref={videoRef} playsInline muted className="w-full aspect-[3/4] object-cover" />
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center text-white/70 text-sm p-6 text-center">{strings.noCamera}</div>
        )}
        <button
          type="button"
          aria-label={strings.shutter}
          onClick={shutter}
          className="shutter absolute bottom-5 left-1/2 -translate-x-1/2"
        />
      </CameraFrame>

      <Card>
        <span className="lbl">{strings.photoLabel}</span>
        <p className="text-slate2 text-sm">{strings.photoHint}</p>
        <div className="flex gap-2 flex-wrap mt-2">
          <label className="btn btn-secondary filebtn !mt-0">
            {strings.takePhoto}
            <input type="file" accept={ACCEPT} capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </label>
          <Button variant="secondary" onClick={useDemoPhoto}>{strings.demoPhoto}</Button>
        </div>
        {previews.length > 0 && (
          <div className="thumbs stagger">
            {previews.map((u, i) => (
              <div key={u} className="thumb pop-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`scan photo ${i + 1}`} />
                {i === 0 && <span className="badge">{strings.mainPhoto}</span>}
                <button type="button" aria-label={`${strings.removePhoto} ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <label className="lbl" htmlFor="transcript">{strings.transcriptLabel}</label>
        <textarea id="transcript" rows={3} placeholder={strings.transcriptPh} value={transcript} onChange={(e) => setTranscript(e.target.value)} maxLength={2000} />
        <canvas ref={waveRef} width={300} height={40} className="w-full h-10 rounded bg-neutral-100" hidden={!recording} />
        <div className="flex gap-2 items-center mt-2">
          <Button variant={recording ? "accent" : "secondary"} onClick={toggleRecord}>
            {recording ? `● ${strings.stop}` : `🎙 ${strings.holdTalk}`}
          </Button>
          {transcribing && <span className="text-slate2 text-sm">{strings.transcribing}</span>}
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => { setError(""); setPhase("idle"); }} />}

      <Button size="lg" variant="accent" disabled={working || photos.length === 0} onClick={submit}>
        {working ? (
          <span className="ticker" key={stepMsg}><span>{steps[Math.min(stepMsg, steps.length - 1)]}…</span></span>
        ) : strings.submit}
      </Button>
      {working && (
        <ol className="steps mt-3 stagger">
          {steps.map((s, i) => (
            <li key={s} className={i <= stepMsg ? "" : "muted"}>{i < stepMsg ? `✓ ${s}` : i === stepMsg ? `… ${s}` : s}</li>
          ))}
        </ol>
      )}
      {phase === "idle" && photos.length === 0 && !error && <Skeleton className="hidden" />}
    </main>
  );
}
