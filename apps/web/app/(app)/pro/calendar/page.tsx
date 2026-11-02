"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Button, Card, DateField, EmptyState, ErrorState, FlowNav, Skeleton } from "@/components/ui";

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
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
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
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.calTitle}</h1>
      <p className="text-sm text-muted">{strings.calSub}</p>
      {error && <ErrorState message={error} onRetry={() => { setError(""); loadPlan(day); }} />}

      <Card>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, i) => dayISO(i)).map((d) => (
            <Button key={d} variant={d === day ? "primary" : "secondary"} onPress={() => loadPlan(d)}>
              {d.slice(5)}
            </Button>
          ))}
        </div>
        <div className="mt-2">
          <DateField
            label={strings.dayJobs}
            value={undefined}
            onChange={(v) => {
              if (v) {
                const iso = `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
                loadPlan(iso);
              }
            }}
          />
        </div>
      </Card>

      <Card className="!border-signal">
        <div className="text-xs text-muted">{day} · {jobs.length} jobs</div>
        {briefing ? <p className="mt-1">{briefing}</p> : <Skeleton className="h-10" />}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" onPress={speak}>🔊 {strings.speakBrief}</Button>
          <Button variant="secondary" loading={busy} onPress={blockDay}>{strings.blockDay}</Button>
        </div>
      </Card>

      {jobs.length > 0 && (
        <Card>
          <h2 className="font-bold">{strings.dayJobs}</h2>
          <ul className="mt-1 space-y-1 text-sm">{jobs.map((j) => <li key={j.jobId}>{j.slot.slice(11, 16)} — {j.title}</li>)}</ul>
        </Card>
      )}
      {jobs.length === 0 && briefing !== "" && (
        <EmptyState
          title={strings.dayJobs}
          hint={strings.queueEmpty}
          image={{ src: "/images/showcase/cambio-de-chapa.webp", alt: "" }}
          action={<a className="inline-flex items-center justify-center gap-2 rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg" href="/scan">{strings.startScan}</a>}
        />
      )}

      {blocks.length > 0 && (
        <Card>
          <h2 className="font-bold">{strings.blocks}</h2>
          <ul className="mt-1 space-y-1 text-sm">
            {blocks.map((b) => (
              <li key={b.id}>
                {b.starts_at.slice(0, 10)} · {b.kind} {b.note}
                <Button variant="ghost" className="ml-2 px-1 py-0 text-sm" aria-label="remove" onPress={async () => {
                  await fetch(`/api/calendar/blocks?id=${encodeURIComponent(b.id)}`, { method: "DELETE" });
                  await loadBlocks();
                }}>
                  ×
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-bold">ICS</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" onPress={mintFeed}>{strings.newFeed}</Button>
          <Button
            variant="secondary"
            onPress={async () => {
              await fetch("/api/calendar/feed", { method: "DELETE" });
              setFeedUrl("");
            }}
          >
            {strings.revokeFeed}
          </Button>
        </div>
        {feedUrl && <p className="mt-1 break-all text-xs text-muted">{feedUrl}</p>}
      </Card>
      <FlowNav backHref="/pro" backLabel={strings.back} />
    </main>
  );
}
