"use client";

import React, { useEffect, useRef, useState } from "react";

/** Themed component library (shadcn-style API, zero extra deps). */

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Tiny toast bus: call toast("saved") anywhere, render <Toaster/> once in layout. */
export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tasklens:toast", { detail: message }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const onToast = (e: Event) => {
      const id = ++idRef.current;
      const message = String((e as CustomEvent).detail ?? "");
      if (!message) return;
      setItems((xs) => [...xs.slice(-2), { id, message }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2600);
    };
    window.addEventListener("tasklens:toast", onToast);
    return () => window.removeEventListener("tasklens:toast", onToast);
  }, []);
  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">{t.message}</div>
      ))}
    </div>
  );
}

/** Animated number: counts from 0 to value on mount (respects reduced motion). */
export function useCountUp(value: number, durationMs = 900): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return n;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center font-semibold rounded-btn transition active:scale-[0.96] disabled:opacity-55 disabled:cursor-wait";
  const sizes = size === "lg" ? "w-full px-5 py-3.5 text-base mt-2" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-ink text-white shadow-[0_2px_4px_rgba(15,27,45,0.2),0_10px_24px_-12px_rgba(15,27,45,0.5)]",
    secondary: "bg-white text-ink border border-ink",
    accent: "btn-glow btn-sheen text-white bg-[linear-gradient(180deg,#ff8a3d,#f26a1b_60%,#c24e08)]",
    ghost: "bg-transparent text-ink underline",
  };
  return <button className={cn(base, sizes, variants[variant], className)} {...rest} />;
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-card border border-neutral-200/80 bg-white/95 p-4 mb-3 fade-up shadow-[0_1px_2px_rgba(15,27,45,0.06),0_2px_8px_rgba(15,27,45,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(15,27,45,0.06),0_12px_32px_-12px_rgba(15,27,45,0.22)]", className)}>{children}</section>;
}

const badgeColors: Record<string, string> = {
  quoted: "bg-slate2",
  booked: "bg-ink",
  en_route: "bg-accent",
  in_progress: "bg-accent",
  pending_verify: "bg-accent",
  completed: "bg-trust",
  disputed: "bg-red-700",
  verified: "bg-trust",
  held: "bg-ink",
};
export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase", badgeColors[status] ?? "bg-slate2", className)}>
      {(status === "in_progress" || status === "en_route" || status === "pending_verify") && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-white pulse-dot" aria-hidden="true" />
      )}
      {status.replace("_", " ")}
    </span>
  );
}

const STEPS = ["quoted", "booked", "en_route", "in_progress", "pending_verify", "completed"];
export function Stepper({ status }: { status: string }) {
  const ix = STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-1 my-3" aria-label="job progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex-1" title={s}>
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              i < ix ? "bg-trust" : i === ix ? "bg-accent pulse-dot shadow-[0_0_12px_rgba(242,106,27,0.8)]" : "bg-neutral-200",
            )}
          />
        </li>
      ))}
    </ol>
  );
}

export function PriceRange({ lo, hi }: { lo: number; hi: number }) {
  const loN = useCountUp(lo);
  const hiN = useCountUp(hi);
  return (
    <div className="font-display font-extrabold text-4xl tracking-tight">
      ${loN} <span className="text-slate2 text-2xl">– ${hiN}</span>
    </div>
  );
}

/** Animated success check (SVG stroke draw). */
export function DrawCheck({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="#0E9F6E" strokeWidth="3" opacity="0.35" />
      <path className="draw-check" d="M12 20.5 17.5 26 28 14.5" stroke="#0E9F6E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface ProCardPro {
  pro_id: string;
  name?: string;
  reason: string;
  eta_days: number;
  quote_usd: number;
  rating?: number;
  jobsDone?: number;
  distanceKm?: number;
  verified?: boolean;
}

export function ProCard({ pro, selected, onSelect, children }: { pro: ProCardPro; selected: boolean; onSelect: () => void; children?: React.ReactNode }) {
  return (
    <label className={cn("rounded-card border bg-white p-4 mb-3 flex gap-3 cursor-pointer fade-up", selected ? "border-accent ring-2 ring-accent/30" : "border-neutral-200")}>
      <input type="radio" name="pro" className="mt-1" checked={selected} onChange={onSelect} />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <strong>{pro.name ?? pro.reason}</strong>
          {pro.verified !== false && <span className="text-trust text-xs font-bold">✓ verified</span>}
        </div>
        {pro.name && <div className="text-sm text-slate2">{pro.reason}</div>}
        <div className="text-xs text-slate2 mt-1">
          {pro.rating ? `★ ${pro.rating.toFixed(1)}` : ""} {pro.jobsDone ? `· ${pro.jobsDone} jobs` : ""} {pro.distanceKm !== undefined ? `· ${pro.distanceKm.toFixed(1)} km` : ""} · ~{pro.eta_days}d · ${pro.quote_usd}
        </div>
        {children}
      </div>
    </label>
  );
}

export interface FeedEvent {
  id: string;
  kind: string;
  createdAt: number;
  payload?: unknown;
}

export function Timeline({ events, label }: { events: FeedEvent[]; label: (kind: string) => string }) {
  if (events.length === 0) return <p className="text-slate2 text-sm">—</p>;
  const ordered = [...events].reverse();
  return (
    <ol className="relative ml-2 border-l-2 border-neutral-200 pl-4 space-y-3">
      {ordered.map((e, i) => (
        <li key={e.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 7) * 60}ms` }}>
          {i === 0 ? (
            <span className="absolute -left-[9px] mt-1 live-dot" aria-hidden="true" />
          ) : (
            <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-accent border-2 border-white" />
          )}
          <strong className="text-sm">{label(e.kind)}</strong>
          <div className="text-xs text-slate2">{new Date(e.createdAt).toLocaleString()}</div>
        </li>
      ))}
    </ol>
  );
}

export function CameraFrame({ children, scanning }: { children: React.ReactNode; scanning?: boolean }) {
  return (
    <div className="viewfinder relative rounded-card overflow-hidden border border-neutral-200 bg-ink shadow-[0_2px_4px_rgba(15,27,45,0.2),0_20px_50px_-16px_rgba(15,27,45,0.5)]">
      {children}
      {scanning && <div className="scan-beam" aria-hidden="true" />}
    </div>
  );
}

export function BottomSheet({ children }: { children: React.ReactNode }) {
  return <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md rounded-t-card bg-white border-t border-neutral-200 p-4 pb-8 shadow-2xl fade-up sm:max-w-2xl">{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skel rounded-card", className)} aria-hidden="true" />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-card border border-dashed border-neutral-300 bg-white p-6 text-center">
      <div className="font-display text-lg font-bold">{title}</div>
      {hint && <p className="text-sm text-slate2 mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p className="rounded-card border border-red-200 bg-red-50 text-red-800 p-3" role="alert">
      {message}{" "}
      {onRetry && (
        <button type="button" className="underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </p>
  );
}
