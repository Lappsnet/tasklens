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

export default function TrustGrid({ title, items }: {
  title: string;
  items: { icon: string; title: string; text: string }[];
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
      <h2 className="font-display text-2xl font-bold lg:text-3xl">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const Ico = ICONS[it.icon] ?? ShieldCheck;
          return (
            <article key={it.title} className="rounded-card border border-line bg-surface p-4 shadow-soft">
              <Ico size={26} weight="duotone" className="text-verified" aria-hidden="true" />
              <h3 className="mt-2 font-bold">{it.title}</h3>
              <p className="mt-1 text-sm text-muted">{it.text}</p>
            </article>
          );
        })}
      </div>
      <div ref={sealRef} className="mt-4 flex justify-center" aria-hidden={!sealed}>
        {sealed && <StampSeal />}
      </div>
    </div>
  );
}
