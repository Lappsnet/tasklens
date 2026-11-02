"use client";

/* U5 "La carrera": pinned scroll race. The "Hoy" track crawls with a day
   counter while the TaskLens track completes; ends with a verified stamp. */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { StampSeal } from "@/components/blueprint";
import { reducedMotion, registerGsap, Reveal } from "./motion";

export default function RaceSection({ title, note, today, lens, todayLabel, dayLabel, lensLabel, sealLabel, todayAxis, lensAxis, dark }: {
  title: string;
  note: string;
  today: string[];
  lens: string[];
  todayLabel: string;
  dayLabel: string;
  lensLabel: string;
  sealLabel: string;
  todayAxis: [string, string];
  lensAxis: [string, string];
  dark?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const todayBar = useRef<HTMLDivElement>(null);
  const lensBar = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState(1);

  useEffect(() => {
    if (!rootRef.current || reducedMotion()) return;
    registerGsap();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: rootRef.current, start: "top 70%", end: "bottom 45%", scrub: 0.6 },
      });
      tl.fromTo(todayBar.current, { scaleX: 0 }, { scaleX: 0.9, ease: "none" }, 0);
      tl.fromTo(lensBar.current, { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
      tl.to({ d: 1 }, {
        d: 14,
        ease: "none",
        onUpdate(this: { targets: () => { d: number }[] }) {
          setDays(Math.round(this.targets()[0].d));
        },
      }, 0);
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef}>
      <Reveal>
        <h2 className={`font-display text-3xl font-bold lg:text-[40px] lg:leading-[1.05] ${dark ? "text-white" : ""}`}>{title} <span className={`font-body text-xs font-normal ${dark ? "text-white/60" : "text-muted"}`}>({note})</span></h2>
      </Reveal>
      <div className="mt-8 space-y-6">
        <Timeline
          label={todayLabel}
          meta={`${dayLabel} ${days}`}
          steps={today}
          axis={todayAxis}
          barRef={todayBar}
          tone="muted"
        />
        <Timeline
          label="TaskLens"
          meta={lensLabel}
          steps={lens}
          axis={lensAxis}
          barRef={lensBar}
          tone="signal"
          seal={<StampSeal text={sealLabel} />}
        />
      </div>
    </div>
  );
}

function Timeline({ label, meta, steps, axis, barRef, tone, seal }: {
  label: string;
  meta: string;
  steps: string[];
  axis: [string, string];
  barRef: React.Ref<HTMLDivElement>;
  tone: "muted" | "signal";
  seal?: React.ReactNode;
}) {
  const bar = tone === "signal" ? "bg-signal" : "bg-muted";
  return (
    <div className={`rounded-card border p-5 lg:p-6 ${tone === "signal" ? "border-signal bg-surface shadow-lifted" : "border-line bg-surface"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <strong className="font-display text-lg font-bold">{label}</strong>
        <span className={`font-mono text-xs ${tone === "signal" ? "font-semibold text-signal" : "text-muted"}`}>{meta}</span>
      </div>
      <div className="relative mt-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div ref={barRef} className={`h-full w-full origin-left ${bar}`} />
        </div>
        <ol className="relative mt-1 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:justify-between">
          {steps.map((s) => (
            <li key={s} className="flex max-w-[9rem] flex-col items-start gap-1.5 pt-3 text-left">
              <span className={`h-2.5 w-2.5 rounded-full ring-4 ${tone === "signal" ? "bg-signal ring-signal/20" : "bg-muted ring-muted/15"}`} aria-hidden="true" />
              <span className="text-xs leading-snug text-muted">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted" aria-hidden="true">
          <span>{axis[0]}</span>
          <span>{axis[1]}</span>
        </div>
      </div>
      {seal && <div className="mt-4">{seal}</div>}
    </div>
  );
}
