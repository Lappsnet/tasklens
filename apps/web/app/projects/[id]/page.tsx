"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, Skeleton } from "@/components/ui";

interface Phase {
  id: string;
  trade: string;
  title: string;
  scope: string;
  est_days: number;
  budget_low_usd: number;
  budget_high_usd: number;
  materials: string[];
  job_id?: string;
  finish_pick?: string;
  status: string;
  seq: number;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [title, setTitle] = useState("");
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [renders, setRenders] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [crew, setCrew] = useState("");
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    try {
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`);
      const json = (await res.json()) as { project?: { title: string }; phases?: Phase[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setTitle(json.project?.title ?? "");
      setPhases(json.phases ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    }
  }

  async function bookCrew() {
    setBusy(true);
    try {
      const res = await fetch("/api/projects/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const json = (await res.json()) as { crew?: unknown[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "crew_failed");
      setCrew(JSON.stringify(json.crew));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "crew_failed");
    } finally {
      setBusy(false);
    }
  }

  async function render(style: "moderno" | "rustico" | "minimalista", photo: FileList | null) {
    const f = photo?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("projectId", id);
    fd.append("style", style);
    fd.append("photo", f, f.name);
    const res = await fetch("/api/projects/render", { method: "POST", body: fd });
    const json = (await res.json()) as { preview?: string };
    if (res.ok && json.preview) setRenders((r) => ({ ...r, [style]: json.preview as string }));
  }

  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{title || strings.projectTitle}</h1>
      {error && <p className="err" role="alert">{error}</p>}
      {!phases && <Skeleton className="h-48" />}
      {phases && (
        <>
          <div className="flex items-center gap-1 my-3" aria-label="project timeline">
            {phases.map((p) => (
              <div key={p.id} className="flex-1" title={p.title}>
                <div className={`h-2 rounded-full ${p.status === "verified" ? "bg-trust" : p.job_id ? "bg-accent" : "bg-neutral-200"}`} />
              </div>
            ))}
          </div>
          {phases.map((p, i) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <strong>{i + 1}. {p.title}</strong>
                <Badge status={p.status} />
              </div>
              <p className="text-sm text-slate2 mt-1">{p.scope}</p>
              <p className="text-sm mt-1">${p.budget_low_usd} – ${p.budget_high_usd} · ~{p.est_days}d · {p.trade}</p>
              {p.job_id ? (
                <Link className="text-sm underline" href={`/jobs/${p.job_id}`}>{p.job_id.slice(0, 8)}… →</Link>
              ) : (
                <span className="text-sm text-slate2">{strings.notBooked}</span>
              )}
              {p.finish_pick && <p className="text-sm mt-1">🎨 {p.finish_pick}</p>}
              {renders[p.finish_pick ?? ""] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={renders[p.finish_pick as string]} alt="finish preview" className="rounded-card mt-2" />
              )}
            </Card>
          ))}
          <Card>
            <h2 className="font-bold">{strings.finishTitle}</h2>
            <div className="flex gap-2 flex-wrap mt-2">
              {(["moderno", "rustico", "minimalista"] as const).map((s) => (
                <label key={s} className="btn btn-secondary filebtn !mt-0">
                  {s}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => render(s, e.target.files)} />
                </label>
              ))}
            </div>
            <Button variant="accent" className="mt-3" disabled={busy} onClick={bookCrew}>{busy ? "…" : strings.bookCrew}</Button>
            {crew && <p className="text-xs text-slate2 mt-2 break-all">{crew.slice(0, 200)}…</p>}
          </Card>
        </>
      )}
    </main>
  );
}
