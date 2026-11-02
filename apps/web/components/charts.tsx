"use client";

/* V6 charts: our own SVG on d3-scale/d3-shape/d3-array math.
   Light gridlines, direct labels, tabular numbers, tooltips with exact values,
   one draw-in animation on view. Every chart has a screen-reader summary. */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { max, min } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}

function useReduced() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(mq.matches);
    const f = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return r;
}

const W = 320;
const H = 120;
const PAD = 8;

export function AreaTrend({ values, label, format }: { values: number[]; label: string; format?: (n: number) => string }) {
  const rawId = useId();
  const id = `g${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const { ref, seen } = useInView<HTMLDivElement>();
  const reduced = useReduced();
  const fmt = format ?? ((n) => String(n));
  const { path, linePath } = useMemo(() => {
    const x = scaleLinear().domain([0, values.length - 1]).range([PAD, W - PAD]);
    const lo = min(values) ?? 0;
    const hi = max(values) ?? 1;
    const y = scaleLinear().domain([Math.min(0, lo), hi]).range([H - PAD, PAD]);
    const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
    return {
      path: area<[number, number]>().x((d) => d[0]).y0(() => H - PAD).y1((d) => d[1]).curve(curveMonotoneX)(pts) ?? "",
      linePath: line<[number, number]>().x((d) => d[0]).y((d) => d[1]).curve(curveMonotoneX)(pts) ?? "",
    };
  }, [values]);
  return (
    <div ref={ref} role="img" aria-label={`${label}: ${values.map(fmt).join(", ")}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blueprint)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--blueprint)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="var(--line)" strokeWidth="1" />
        ))}
        <path d={path} fill={`url(#${id})`} opacity={seen || reduced ? 1 : 0} style={{ transition: "opacity 600ms ease" }} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--blueprint)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-1 font-mono text-xs font-bold tabular-nums">{fmt(values[values.length - 1])}</p>
    </div>
  );
}

export function BarCompare({ values, labels, label }: { values: number[]; labels: string[]; label: string }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const reduced = useReduced();
  const hi = max(values) ?? 1;
  return (
    <div ref={ref} role="img" aria-label={`${label}: ${values.map((v, i) => `${labels[i]} ${v}`).join(", ")}`}>
      <ol className="space-y-2">
        {values.map((v, i) => (
          <li key={labels[i]}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold">{labels[i]}</span>
              <span className="font-mono font-bold tabular-nums">{v}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-[var(--blueprint)]"
                style={{ width: seen || reduced ? `${(v / hi) * 100}%` : "0%", transition: "width 600ms var(--ease-out)" }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const d = useMemo(() => {
    const x = scaleLinear().domain([0, values.length - 1]).range([2, 118]);
    const lo = min(values) ?? 0;
    const hi = max(values) ?? 1;
    const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([26, 4]);
    return line<[number, number]>().x((_, i) => x(i)).y((v) => y(v as unknown as number)).curve(curveMonotoneX)(values as unknown as [number, number][]) ?? "";
  }, [values]);
  return (
    <div ref={ref} role="img" aria-label={label}>
      <svg viewBox="0 0 120 30" className="h-8 w-28" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--verified)" strokeWidth="2" strokeLinecap="round" opacity={seen ? 1 : 0} style={{ transition: "opacity 400ms ease" }} />
      </svg>
    </div>
  );
}

export function ProgressRing({ value, label, size = 72 }: { value: number; label: string; size?: number }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const reduced = useReduced();
  const r = 30;
  const circ = 2 * Math.PI * r;
  const shown = seen || reduced ? value : 0;
  return (
    <div ref={ref} role="img" aria-label={`${label}: ${Math.round(value * 100)}%`} className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--verified)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circ * shown} ${circ}`}
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 600ms var(--ease-out)" }}
        />
        <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--ink)" fontFamily="monospace">
          {Math.round(value * 100)}
        </text>
      </svg>
      <span className="text-xs font-semibold text-muted">{label}</span>
    </div>
  );
}
