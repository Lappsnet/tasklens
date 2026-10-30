"use client";

/* F1.2: exactly one Lenis instance for the marketing page. Mounted once
   (marketing layout after F1.6; landing page until then). */

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { reducedMotion, registerGsap } from "./motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return;
    registerGsap();
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    let raf = 0;
    const loop = (time: number) => {
      tick(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh).catch(() => {});
    window.addEventListener("load", refresh);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", refresh);
      lenis.destroy();
    };
  }, []);
  return null;
}
