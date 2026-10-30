"use client";

/* TaskLens "Blueprint" signature components (U1). Technical-drawing motifs:
   grid, viewfinder brackets, annotation callouts, dimension lines, seal stamp.
   All motion is transform/opacity-only and respects prefers-reduced-motion. */

import React, { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/components/ui";

/** Faint 8px / 40px blueprint grid backdrop. */
export function GridBackdrop({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage:
          "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px), " +
          "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
        backgroundSize: "8px 8px, 8px 8px, 40px 40px, 40px 40px",
        backgroundColor: dark ? "#081120" : undefined,
      }}
    />
  );
}

/** Four corner brackets framing whatever the AI "sees". */
export function Viewfinder({
  children,
  className,
  animate,
}: {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const c = "pointer-events-none absolute h-7 w-7 border-[3px] border-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]";
  return (
    <div className={`relative overflow-hidden rounded-card ${className ?? ""}`}>
      {children}
      <span aria-hidden="true" className={`${c} left-3 top-3 rounded-tl-lg border-b-0 border-r-0 ${animate ? "pop-in" : ""}`} />
      <span aria-hidden="true" className={`${c} right-3 top-3 rounded-tr-lg border-b-0 border-l-0 ${animate ? "pop-in" : ""}`} />
      <span aria-hidden="true" className={`${c} bottom-3 left-3 rounded-bl-lg border-r-0 border-t-0 ${animate ? "pop-in" : ""}`} />
      <span aria-hidden="true" className={`${c} bottom-3 right-3 rounded-br-lg border-l-0 border-t-0 ${animate ? "pop-in" : ""}`} />
    </div>
  );
}

/** Annotation callout: dot at (x%, y%) + leader line + mono label. */
export function Annotation({
  x,
  y,
  label,
  side = "right",
}: {
  x: number;
  y: number;
  label: string;
  side?: "left" | "right";
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 flex items-center gap-0 mask-in"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={label}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
      <span className={`h-px w-8 bg-[var(--signal)] ${side === "left" ? "order-first" : ""}`} aria-hidden="true" />
      <span className="whitespace-nowrap rounded bg-ink/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
        {label}
      </span>
    </div>
  );
}

/** Dimension line with end ticks + centered mono measurement. */
export function DimensionLine({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`} aria-label={label}>
      <span className="h-3 w-px bg-[var(--blueprint)]" aria-hidden="true" />
      <span className="h-px flex-1 bg-[var(--blueprint)]" aria-hidden="true" />
      <span className="font-mono text-xs font-semibold text-[var(--blueprint)]">{label}</span>
      <span className="h-px flex-1 bg-[var(--blueprint)]" aria-hidden="true" />
      <span className="h-3 w-px bg-[var(--blueprint)]" aria-hidden="true" />
    </div>
  );
}

/** Verified stamp seal: circular seal that pops in. */
export function StampSeal({ text = "VERIFICADO" }: { text?: string }) {
  return (
    <div className="pop-in inline-flex items-center justify-center" role="img" aria-label={text}>
      <div className="-rotate-6 rounded-full border-4 border-[var(--verified)] px-4 py-2 shadow-[0_0_0_2px_color-mix(in_srgb,var(--verified)_40%,transparent)]">
        <span className="font-display text-lg font-extrabold uppercase tracking-widest text-[var(--verified)]">
          ✓ {text}
        </span>
      </div>
    </div>
  );
}

/** Standalone scan beam (for custom camera layouts). */
export function ScanBeam() {
  return <div className="scan-beam" aria-hidden="true" />;
}

/** Button that leans toward the cursor (desktop, fine pointer, no reduced motion). */
export function MagneticButton({
  children,
  className,
  strength = 8,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { strength?: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${(dx / r.width) * strength}px, ${(dy / r.height) * strength}px)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <button
      ref={ref}
      type="button"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`transition-transform duration-200 ease-out ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Card with a cursor-follow spotlight (desktop, fine pointer only). */
export function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  }
  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className={`spotlight rounded-card border border-line bg-surface p-4 shadow-soft ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

/** Animated number with optional prefix/suffix and mono styling. */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  durationMs = 900,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const n = useCountUp(value, durationMs);
  return (
    <span className={`font-mono tabular-nums ${className ?? ""}`}>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Auto-scrolling row (marquee); static when reduced motion is preferred. */
export function Marquee({ children, className }: { children: React.ReactNode; className?: string }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return (
    <div className={`marquee-auto overflow-hidden ${className ?? ""}`}>
      <div className={reduced ? "flex gap-2 flex-wrap" : "marquee-track flex gap-2 w-max"}>
        {children}
        {!reduced && children}
      </div>
    </div>
  );
}
