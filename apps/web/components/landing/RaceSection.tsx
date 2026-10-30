"use client";

/* U5 "La carrera": pinned scroll race. The "Hoy" track crawls with a day
   counter while the TaskLens track completes; ends with a verified stamp. */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { StampSeal } from "@/components/blueprint";
import { reducedMotion, registerGsap } from "./motion";

export default function RaceSection({ title, note, today, lens }: {
  title: string;
  note: string;
  today: string[];
  lens: string[];
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
      <h2 className="font-display text-2xl font-bold">{title} <span className="font-body text-xs font-normal text-muted">({note})</span></h2>
      <div className="mt-4 space-y-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <strong className="text-sm">Hoy</strong>
            <span className="font-mono text-xs text-muted">día {days}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
            <div ref={todayBar} className="h-full w-full origin-left bg-muted" />
          </div>
          <p className="mt-2 text-xs text-muted">{today.join(" → ")}</p>
        </div>
        <div className="rounded-card border border-signal bg-surface p-4 shadow-lifted">
          <div className="flex items-baseline justify-between">
            <strong className="text-sm">TaskLens</strong>
            <span className="font-mono text-xs font-semibold text-signal">minutos, no semanas</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
            <div ref={lensBar} className="h-full w-full origin-left bg-signal" />
          </div>
          <p className="mt-2 text-xs text-muted">{lens.join(" → ")}</p>
          <div className="mt-2"><StampSeal text="Verificado" /></div>
        </div>
      </div>
    </div>
  );
}
