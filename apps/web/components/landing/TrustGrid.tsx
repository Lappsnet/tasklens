"use client";

/* U5 trust grid: icon + 2-line explanation each; seal animates on view. */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SealCheck, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { StampSeal } from "@/components/blueprint";
import { reducedMotion, registerGsap } from "./motion";

const ICONS: Record<string, typeof ShieldCheck> = {
  shield: ShieldCheck,
  check: SealCheck,
  badge: SealCheck,
  warn: ShieldWarning,
};

export default function TrustGrid({ title, items, escrowTitle, escrowSteps }: {
  title: string;
  items: { icon: string; title: string; text: string }[];
  escrowTitle: string;
  escrowSteps: [string, string, string, string];
}) {
  const sealRef = useRef<HTMLDivElement>(null);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    if (!sealRef.current) {
      setSealed(true);
      return;
    }
    if (reducedMotion()) {
      setSealed(true);
      return;
    }
    registerGsap();
    const ctx = gsap.context(() => {
      gsap.from(sealRef.current, {
        scale: 1.6,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(2)",
        scrollTrigger: { trigger: sealRef.current, start: "top 85%", onEnter: () => setSealed(true) },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div>
      <h2 className="font-display text-3xl font-bold lg:text-[40px] lg:leading-[1.05]">{title}</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const Ico = ICONS[it.icon] ?? ShieldCheck;
          return (
            <article key={it.title} className="rounded-card border border-line bg-surface p-5 shadow-soft">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-[var(--verified)]/10">
                <Ico size={24} weight="duotone" className="text-verified" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-xl font-bold">{it.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{it.text}</p>
            </article>
          );
        })}
      </div>
      <div className="mt-10 rounded-card border border-line bg-bg p-5 lg:p-6" aria-label={escrowTitle}>
        <h3 className="font-display text-xl font-bold">{escrowTitle}</h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {escrowSteps.map((s, i) => (
            <li key={s} className="relative rounded-card border border-line bg-surface p-4">
              <span className="font-mono text-xs font-bold text-[var(--signal)]" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-1 text-sm font-semibold leading-snug">{s}</p>
              {i < escrowSteps.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 font-bold text-muted lg:block" aria-hidden="true">→</span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <div ref={sealRef} className="mt-4 flex justify-center" aria-hidden={!sealed}>
        {sealed && <StampSeal />}
      </div>
    </div>
  );
}
