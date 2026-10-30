"use client";

/* U5 motion helpers: GSAP + ScrollTrigger registration, Lenis smooth scroll
   (landing only), scroll-reveal. All respect prefers-reduced-motion. */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

let registered = false;
export function registerGsap(): void {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Lenis smooth scroll synced to ScrollTrigger. Call once on the landing page. */
export function useLenis(enabled = true): void {
  useEffect(() => {
    if (!enabled || reducedMotion()) return;
    registerGsap();
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [enabled]);
}

/** Fade-up reveal on scroll for any element. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reducedMotion()) return;
    registerGsap();
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        y: 28,
        opacity: 0,
        duration: 0.7,
        delay,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 88%" },
      });
    });
    return () => ctx.revert();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}
