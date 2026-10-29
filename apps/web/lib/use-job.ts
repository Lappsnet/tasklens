"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserClient } from "./realtime";

export interface FeedEvent {
  id: string;
  job_id: string;
  kind: string;
  payload: unknown;
  createdAt: number;
}

export interface FeedJob {
  id: string;
  status: string;
  price_usd: number;
  pro_id: string;
  slot: string | null;
  payment?: { status: string };
}

/** Live job feed: Supabase Realtime when configured, 2s polling otherwise. */
export function useJobFeed(jobId: string) {
  const [job, setJob] = useState<FeedJob | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs?id=${encodeURIComponent(jobId)}`);
      const json = (await res.json()) as { job?: FeedJob; events?: FeedEvent[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setJob(json.job ?? null);
      setEvents(json.events ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    }
  }, [jobId]);

  useEffect(() => {
    load();
    const sb = browserClient();
    if (sb) {
      const ch = sb
        .channel(`job-${jobId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "job_events", filter: `job_id=eq.${jobId}` }, load)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, load)
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
      return () => {
        sb.removeChannel(ch);
      };
    }
    timer.current = setInterval(load, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [jobId, load]);

  return { job, events, live, error, reload: load };
}

export function eventLabel(kind: string): string {
  switch (kind) {
    case "booked":
      return "Booked — payment held";
    case "en_route":
      return "Pro is on the way";
    case "in_progress":
      return "Work started";
    case "pending_verify":
      return "Submitted for verification";
    case "note":
      return "Voice note";
    case "step":
      return "Checklist";
    case "verified":
      return "AI verification";
    case "highlight":
      return "Damage highlight";
    case "payment_released":
      return "Payment released";
    case "completed":
      return "Completed";
    default:
      if (kind.startsWith("photo_")) return kind === "photo_before" ? "Before photos" : "After photos";
      return kind;
  }
}
