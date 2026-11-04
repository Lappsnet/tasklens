"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, CameraFrame, Card, ErrorState, Field, FlowNav, IconButton, Input, Textarea } from "@/components/ui";

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
  const [flash, setFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
    const incoming = Array.from(list).slice(0, 3 - photos.length);
    if (incoming.length === 0) return;
    // Downscale before upload: full-res phone photos (3-8 MB each) blow past
    // serverless payload limits (502) and stall inference. 1280px JPEG is
    // plenty for the damage overlay + quote.
    void Promise.all(incoming.map((f) => downscaleImage(f))).then((downsized) => {
      const next = [...photos];
      for (const f of downsized) {
        if (!ACCEPT.split(",").includes(f.type) || f.size > MAX_FILE || f.size === 0) {
          setError(strings.errorPhotos);
          continue;
        }
        next.push(f);
      }
      setPhotos(next.slice(0, 3));
    });
  }

/** Shrink huge phone photos to a 1280px JPEG (returns the original on failure). */
async function downscaleImage(file: File, maxDim = 1280, quality = 0.82): Promise<File> {
  try {
    if (!("createImageBitmap" in window)) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size <= 1_500_000) {
      bitmap.close();
      return file;
    }
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bitmap.width * scale));
    c.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/* Meta /v1/asr/transcribe only accepts RIFF/WAVE mono 16-bit PCM (16/24 kHz):
   a webm/mp4 upload is a guaranteed 400. Decode the recording and re-encode
   to 24 kHz mono WAV in-browser (no deps). Falls back to the original blob. */
async function recordingToWav(blob: Blob): Promise<{ blob: Blob; name: string; type: string }> {
  const fallback = { blob, name: "note.webm", type: blob.type || "audio/webm" };
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC || typeof AC !== "function") return fallback;
    const raw = await blob.arrayBuffer();
    const ctx = new AC();
    try {
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      if (!decoded || decoded.length === 0) return fallback;
      const targetRate = 24000;
      const n = decoded.length;
      const channels = decoded.numberOfChannels;
      const ratio = decoded.sampleRate / targetRate;
      const len = Math.max(1, Math.floor(n / ratio));
      const mono = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const srcIx = Math.min(n - 1, Math.floor(i * ratio));
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += decoded.getChannelData(c)[srcIx];
        mono[i] = sum / channels;
      }
      return { blob: new Blob([encodeWavPcm16(mono, targetRate)], { type: "audio/wav" }), name: "note.wav", type: "audio/wav" };
    } finally {
      ctx.close().catch(() => undefined);
    }
  } catch {
    return fallback;
  }
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const wstr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  wstr(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wstr(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

  function shutter() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError(strings.errorPhotos);
      return;
    }
    // Capture flash + haptic: the photo shrinks into its card below.
    setFlash(true);
    try {
      navigator.vibrate?.(15);
    } catch {
      /* ignore */
    }
    setTimeout(() => setFlash(false), 250);
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")?.drawImage(video, 0, 0);
    c.toBlob((b) => {
      if (!b) {
        setError(strings.errorGeneric);
        return;
      }
      const raw = new File([b], `live-${Date.now()}.jpg`, { type: "image/jpeg" });
      void downscaleImage(raw).then((f) => {
        setPhotos((p) => [...p, f].slice(0, 3));
      });
    }, "image/jpeg", 0.9);
  }

  function useDemoPhoto() {
    void useExamplePhoto("grifo-cocina-danado");
  }

  /** V7: real showcase photos as example chips (demo examples, same job pool). */
  const EXAMPLES = [
    { id: "tomacorriente-derretido", src: "/images/showcase/tomacorriente-derretido.webp" },
    { id: "grifo-cocina-danado", src: "/images/showcase/grifo-cocina-danado.webp" },
    { id: "puerta-chapa-danada", src: "/images/showcase/puerta-chapa-danada.webp" },
  ] as const;

  async function useExamplePhoto(id: string) {
    const found = EXAMPLES.find((e) => e.id === id);
    if (!found) return;
    setError("");
    try {
      const res = await fetch(found.src);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const file = new File([blob], `${found.id}.webp`, { type: "image/webp" });
      setPhotos((p) => [...p, file].slice(0, 3));
    } catch {
      setError(strings.errorPhotos);
    }
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

  async function startRecord() {
    if (recording || transcribing) return;
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
        const recType = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recType });
        if (blob.size === 0) return;
        // Convert to 24 kHz mono WAV: the only container Meta accepts.
        // voiceRef holds WAV from here, so the /api/scan fallback gets it too.
        const conv = await recordingToWav(blob);
        voiceRef.current = conv.blob;
        setTranscribing(true);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 30_000);
        try {
          const fd = new FormData();
          fd.append("audio", new File([conv.blob], conv.name, { type: conv.type }), conv.name);
          fd.append("lang", lang);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd, signal: ctrl.signal });
          const json = (await res.json()) as { transcript?: string; error?: string };
          if (res.status === 401) throw new Error("auth");
          if (!res.ok || !json.transcript) throw new Error(json.error ?? "transcribe_failed");
          setTranscript(json.transcript);
        } catch (e) {
          // Tell the user instead of staying silent: the voice blob is kept,
          // so /api/scan still transcribes it server-side at submit time.
          setError(e instanceof Error && e.message === "auth" ? strings.errorLoginFirst : strings.errorTranscribe);
        } finally {
          clearTimeout(timer);
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError(strings.errorTranscribe);
    }
  }

  function stopRecord() {
    try {
      recorderRef.current?.stop();
    } catch {
      setRecording(false);
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
        const vt = voiceRef.current.type || "audio/wav";
        const vn = vt.includes("wav") ? "note.wav" : "note.webm";
        fd.append("audio", new File([voiceRef.current], vn, { type: vt }));
      }
      const res = await fetch("/api/scan", { method: "POST", body: fd });
      const json = (await res.json()) as { scanId?: string; error?: string };
      if (!res.ok || !json.scanId) {
        if (json.error === "ai_unavailable") throw new Error(strings.errorAi);
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
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.scanTitle}</h1>
        <div className="flex gap-1" role="group" aria-label={strings.langLabel}>
          {(["en", "es"] as Lang[]).map((l) => (
            <Button key={l} variant={l === lang ? "primary" : "secondary"} className="px-3 py-1.5 text-sm" onPress={() => pickLang(l)}>
              {l.toUpperCase()}
            </Button>
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
        {flash && <div className="absolute inset-0 z-10 bg-white mask-in" aria-hidden="true" />}
        <button
          type="button"
          aria-label={strings.shutter}
          onClick={shutter}
          className="shutter absolute bottom-5 left-1/2 -translate-x-1/2"
        />
      </CameraFrame>

      <Card>
        <span className="font-bold">{strings.photoLabel}</span>
        <p className="text-muted text-sm">{strings.photoHint}</p>
        <div className="flex gap-2 flex-wrap mt-2">
          <input ref={fileRef} type="file" accept={ACCEPT} capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <Button variant="secondary" onPress={() => fileRef.current?.click()}>{strings.takePhoto}</Button>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">{strings.demoPhoto}</p>
        <div className="mt-2 flex gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => void useExamplePhoto(e.id)}
              className="relative h-20 w-20 overflow-hidden rounded-[10px] border border-line outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-signal"
              aria-label={`${strings.demoPhoto}: ${e.id}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {previews.length > 0 && (
          <div className="stagger mt-3 flex flex-wrap gap-2">
            {previews.map((u, i) => (
              <div key={u} className="pop-in relative h-24 w-24 overflow-hidden rounded-[10px] border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`scan photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <Badge status="main" className="absolute bottom-0.5 left-0.5 !px-1.5 !py-0.5 !text-[0.7rem]" />}
                <IconButton label={`${strings.removePhoto} ${i + 1}`} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 !h-6 !w-6 rounded-full border-0 bg-black/70 text-white">
                  ×
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Field label={strings.transcriptLabel}>
          <Textarea id="transcript" rows={3} placeholder={strings.transcriptPh} value={transcript} onChange={(e) => setTranscript(e.target.value)} maxLength={2000} />
        </Field>
        <canvas ref={waveRef} width={300} height={40} className="w-full h-10 rounded bg-ink/5 mt-2" hidden={!recording} />
        <div className="flex gap-2 items-center mt-2">
          <Button variant={recording ? "accent" : "secondary"} onPressStart={startRecord} onPressEnd={stopRecord}>
            {recording ? `● ${strings.stop}` : `🎙 ${strings.holdTalk}`}
          </Button>
          {transcribing && <span className="text-muted text-sm">{strings.transcribing}</span>}
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => { setError(""); setPhase("idle"); }} />}

      <Button size="lg" variant="accent" disabled={working || photos.length === 0} onClick={submit}>
        {working ? (
          <span className="ticker" key={stepMsg}><span>{steps[Math.min(stepMsg, steps.length - 1)]}…</span></span>
        ) : strings.submit}
      </Button>
      {working && (
        <Card>
          <ol className="space-y-1.5 font-mono text-xs">
            {steps.map((s, i) => (
              <li key={s} className={i <= stepMsg ? "text-ink font-semibold" : "text-muted"}>
                {i < stepMsg ? `✓ ${s}` : i === stepMsg ? <span className="ticker" key={stepMsg}><span>… {s}</span></span> : `○ ${s}`}
              </li>
            ))}
          </ol>
        </Card>
      )}
      <FlowNav backHref="/" backLabel={strings.back} />
    </main>
  );
}
