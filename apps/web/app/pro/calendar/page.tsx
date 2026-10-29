"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

interface DayJob {
  jobId: string;
  slot: string;
  title: string;
  materials: string[];
}

interface CalBlock {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: string;
  note: string;
}

function dayISO(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function ProCalendarPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [day, setDay] = useState(dayISO(1));
  const [jobs, setJobs] = useState<DayJob[]>([]);
  const [briefing, setBriefing] = useState("");
  const [blocks, setBlocks] = useState<CalBlock[]>([]);
  const [feedUrl, setFeedUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const strings = t(lang);

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    loadBlocks();
    loadPlan(dayISO(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlan(d: string) {
    setDay(d);
    try {
      const res = await fetch(`/api/calendar/dayplan?date=${encodeURIComponent(d)}`);
      const json = (await res.json()) as { jobs?: DayJob[]; briefing?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setJobs(json.jobs ?? []);
      setBriefing(json.briefing ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    }
  }

  async function loadBlocks() {
    try {
      const res = await fetch("/api/calendar/blocks");
      const json = (await res.json()) as { blocks?: CalBlock[] };
      if (res.ok) setBlocks(json.blocks ?? []);
    } catch {
      /* optional panel */
    }
  }

  async function blockDay() {
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: `${day}T00:00:00`, endsAt: `${day}T23:59:00`, kind: "busy", note: "day off" }),
      });
      if (!res.ok) throw new Error("block_failed");
      await loadBlocks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "block_failed");
    } finally {
      setBusy(false);
    }
  }

  function speak() {
    if (!briefing || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(briefing);
    u.lang = lang === "es" ? "es-ES" : "en-US";
    window.speechSynthesis.speak(u);
  }

  async function mintFeed() {
    const res = await fetch("/api/calendar/feed", { method: "POST" });
    const json = (await res.json()) as { url?: string };
    if (res.ok && json.url) setFeedUrl(json.url);
  }

  return (
    <main>
      <h1>{strings.calTitle}</h1>
      <p className="muted">{strings.calSub}</p>
      {error && <p className="err" role="alert">{error}</p>}

      <section className="card">
        <div className="row">
          {Array.from({ length: 7 }, (_, i) => dayISO(i)).map((d) => (
            <button key={d} type="button" className={`btn ${d === day ? "" : "btn-secondary"}`} onClick={() => loadPlan(d)}>
              {d.slice(5)}
            </button>
          ))}
        </div>
      </section>

      <section className="card highlight">
        <div className="muted small">{day} · {jobs.length} jobs</div>
        <p>{briefing || "…"}</p>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={speak}>🔊 {strings.speakBrief}</button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={blockDay}>{strings.blockDay}</button>
        </div>
      </section>

      {jobs.length > 0 && (
        <section className="card">
          <h2>{strings.dayJobs}</h2>
          <ul>{jobs.map((j) => <li key={j.jobId}>{j.slot.slice(11, 16)} — {j.title}</li>)}</ul>
        </section>
      )}

      {blocks.length > 0 && (
        <section className="card">
          <h2>{strings.blocks}</h2>
          <ul>
            {blocks.map((b) => (
              <li key={b.id}>
                {b.starts_at.slice(0, 10)} · {b.kind} {b.note}
                <button
                  type="button"
                  className="link"
                  onClick={async () => {
                    await fetch(`/api/calendar/blocks?id=${encodeURIComponent(b.id)}`, { method: "DELETE" });
                    await loadBlocks();
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>ICS</h2>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={mintFeed}>{strings.newFeed}</button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              await fetch("/api/calendar/feed", { method: "DELETE" });
              setFeedUrl("");
            }}
          >
            {strings.revokeFeed}
          </button>
        </div>
        {feedUrl && <p className="muted small" style={{ wordBreak: "break-all" }}>{feedUrl}</p>}
      </section>
    </main>
  );
}
