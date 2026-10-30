"use client";

/* U5 motion helpers: GSAP + ScrollTrigger registration, Lenis smooth scroll
   (landing only), scroll-reveal. All respect prefers-reduced-motion. */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;
export function registerGsap(): void {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fade-up reveal on scroll for any element.
 * Never wrap a pinned/sticky section — reveal headings only. Uses fromTo with
 * clearProps so no inline transform/opacity is left behind, and fires once. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reducedMotion()) return;
    registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          delay,
          ease: "power2.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
        });
    });
    return () => ctx.revert();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}
