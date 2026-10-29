"use client";

import React from "react";

/** P0-3 themed component library (shadcn-style API, zero extra deps). */

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center font-semibold rounded-btn transition active:scale-[0.98] disabled:opacity-55 disabled:cursor-wait";
  const sizes = size === "lg" ? "w-full px-5 py-3.5 text-base mt-2" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-ink text-white",
    secondary: "bg-white text-ink border border-ink",
    accent: "bg-accent text-white",
    ghost: "bg-transparent text-ink underline",
  };
  return <button className={cn(base, sizes, variants[variant], className)} {...rest} />;
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-card border border-neutral-200 bg-white p-4 mb-3 fade-up", className)}>{children}</section>;
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
    <span className={cn("text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase", badgeColors[status] ?? "bg-slate2", className)}>
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
          <div className={cn("h-2 rounded-full", i < ix ? "bg-trust" : i === ix ? "bg-accent pulse-dot" : "bg-neutral-200")} />
        </li>
      ))}
    </ol>
  );
}

export function PriceRange({ lo, hi }: { lo: number; hi: number }) {
  return (
    <div className="font-display font-extrabold text-4xl tracking-tight">
      ${lo} <span className="text-slate2 text-2xl">– ${hi}</span>
    </div>
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
  return (
    <ol className="relative ml-2 border-l-2 border-neutral-200 pl-4 space-y-3">
      {events.map((e) => (
        <li key={e.id} className="fade-up">
          <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-accent border-2 border-white" />
          <strong className="text-sm">{label(e.kind)}</strong>
          <div className="text-xs text-slate2">{new Date(e.createdAt).toLocaleString()}</div>
        </li>
      ))}
    </ol>
  );
}

export function CameraFrame({ children }: { children: React.ReactNode }) {
  return <div className="relative rounded-card overflow-hidden border border-neutral-200 bg-ink">{children}</div>;
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
