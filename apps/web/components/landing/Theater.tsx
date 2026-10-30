"use client";

/* U5 feature theater: phone mockup pinned center/right while chapters scroll
   on the left; the mockup cross-fades per active chapter. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Annotation, Viewfinder } from "@/components/blueprint";
import type { FeatureChapter } from "@/content/landing.es";
import { reducedMotion, registerGsap } from "./motion";

function MockScreen({ chapter, active }: { chapter: FeatureChapter; active: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col p-3 transition-opacity duration-300 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!active}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{chapter.slug}</div>
      <div className="mt-1 font-display text-base font-extrabold leading-tight">{chapter.name}</div>
      <div className="mt-0.5 text-[11px] text-muted">{chapter.promise}</div>
      <Viewfinder className="mt-2 border border-line" animate={false}>
        <div className="relative aspect-[4/3] bg-bg">
          <div className="absolute left-[30%] top-[25%] h-8 w-16 rounded bg-[var(--signal)]/70" aria-hidden="true" />
          <Annotation x={58} y={34} label="$120–220" />
        </div>
      </Viewfinder>
      <ul className="mt-2 space-y-1">
        {chapter.how.map((h) => (
          <li key={h} className="flex gap-1.5 text-[11px]">
            <span className="text-verified" aria-hidden="true">✓</span>
            <span className="text-ink/90">{h}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {chapter.tech.map((t) => (
          <span key={t} className="rounded-full bg-blueprint/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-blueprint">{t}</span>
        ))}
        {chapter.who.map((w) => (
          <span key={w} className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] font-semibold text-muted">{w}</span>
        ))}
      </div>
    </div>
  );
}

export default function Theater({ title, sub, chapters }: { title: string; sub: string; chapters: FeatureChapter[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || reducedMotion()) return;
    registerGsap();
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>("[data-chapter]");
      items.forEach((el, i) => {
        gsap.fromTo(el, { opacity: 0.35 }, {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 75%",
            end: "top 30%",
            scrub: true,
            onToggle: (self) => {
              if (self.isActive) setActive(i);
            },
          },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold lg:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{sub}</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div ref={listRef} className="space-y-8">
          {chapters.map((c, i) => (
            <article key={c.slug} data-chapter data-index={i} className={`rounded-card border p-4 transition-colors ${active === i ? "border-signal bg-surface shadow-lifted" : "border-line bg-surface/60"}`}>
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{String(i + 1).padStart(2, "0")} · {c.slug}</div>
              <Link href={`/funciones/${c.slug}`} className="mt-1 block font-display text-xl font-extrabold underline-offset-4 hover:underline">
                {c.name} →
              </Link>
              <p className="text-sm text-muted">{c.promise}</p>
              <ul className="mt-2 space-y-1">
                {c.how.map((h) => (
                  <li key={h} className="flex gap-1.5 text-sm">
                    <span className="text-verified" aria-hidden="true">✓</span>{h}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.tech.map((t) => (
                  <span key={t} className="rounded-full bg-blueprint/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-blueprint">{t}</span>
                ))}
                {c.who.map((w) => (
                  <span key={w} className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-semibold text-muted">{w}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mx-auto w-full max-w-[300px] rounded-[2.2rem] border border-line bg-ink p-2.5 shadow-lifted">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] bg-surface">
              {chapters.map((c, i) => (
                <MockScreen key={c.slug} chapter={c} active={i === active} />
              ))}
            </div>
            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-white/25" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
