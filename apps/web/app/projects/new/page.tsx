"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

export default function NewProjectPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [video, setVideo] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  async function sampleFrames(f: File): Promise<File[]> {
    const url = URL.createObjectURL(f);
    try {
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "auto";
      v.src = url;
      await new Promise((res, rej) => {
        v.onloadedmetadata = res;
        v.onerror = rej;
      });
      const n = 8;
      const out: File[] = [];
      for (let i = 0; i < n; i++) {
        const t = (v.duration * (i + 0.5)) / n;
        await new Promise<void>((res) => {
          const done = () => {
            v.removeEventListener("seeked", done);
            res();
          };
          v.addEventListener("seeked", done);
          v.currentTime = Math.min(t, Math.max(0, v.duration - 0.1));
          setTimeout(res, 1500);
        });
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 360;
        c.getContext("2d")?.drawImage(v, 0, 0, 640, 360);
        const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
        if (blob) out.push(new File([blob], `frame-${i}.jpg`, { type: "image/jpeg" }));
      }
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function submit() {
    if (!video) {
      setError(strings.errorPhotos);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const frames = await sampleFrames(video);
      if (frames.length === 0) throw new Error(strings.errorGeneric);
      const fd = new FormData();
      fd.append("transcript", transcript);
      frames.forEach((f) => fd.append("frames", f, f.name));
      const res = await fetch("/api/projects/plan", { method: "POST", body: fd });
      const json = (await res.json()) as { project?: { id: string }; error?: string };
      if (!res.ok || !json.project) throw new Error(json.error ?? "plan_failed");
      router.push(`/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{strings.projectTitle}</h1>
      <p className="text-slate2">{strings.projectSub}</p>
      {error && <p className="err" role="alert">{error}</p>}
      <section className="card">
        <label className="lbl" htmlFor="walk">{strings.walkthrough}</label>
        <input
          id="walk"
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              if (f.size > 50 * 1024 * 1024) setError(strings.errorPhotos);
              else {
                setVideo(f);
                if (videoRef.current) videoRef.current.src = URL.createObjectURL(f);
              }
            }
          }}
        />
        <video ref={videoRef} controls playsInline className="w-full rounded-card mt-2" />
      </section>
      <section className="card">
        <label className="lbl" htmlFor="pwant">{strings.wantLabel}</label>
        <textarea id="pwant" rows={2} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={strings.wantPh} maxLength={2000} />
      </section>
      <button type="button" className="btn big !bg-accent" disabled={busy || !video} onClick={submit}>
        {busy ? "…" : strings.makePlan}
      </button>
    </main>
  );
}
