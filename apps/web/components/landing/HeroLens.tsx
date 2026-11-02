"use client";

/* U5 hero: dark blueprint, SplitText headline, "The Lens" — a cursor-following
   circular AI view (SAM mask + annotations + grid) over a site drawing.
   Mobile auto-glides. 2D only (3D variant cut per spec when time runs short). */

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { MagneticButton } from "@/components/blueprint";
import { Marquee } from "@/components/blueprint";
import type { LandingContent } from "@/content/landing.es";
import { reducedMotion, registerGsap } from "./motion";
import { BRAND_IMAGES, SHOWCASE_JOBS } from "@/content/showcase";

// Hero photo: a real "reported" job from the showcase (demo example). The burnt area sits at
// about x 68%, y 72% of the 4:3 stage; the lens rests there and the callouts point at it.
const HERO = SHOWCASE_JOBS.find((j) => j.id === "tomacorriente-derretido") ?? SHOWCASE_JOBS[0];
const GLASSES = BRAND_IMAGES.find((b) => b.id === "lentes-meta-display-detalle");

function HeroPhoto({ dim }: { dim?: boolean }) {
  return (
    <picture>
      <source srcSet={HERO.image.avif} type="image/avif" />
      <img
        src={HERO.image.src}
        width={HERO.image.width}
        height={HERO.image.height}
        alt=""
        loading="eager"
        decoding="async"
        className={"absolute inset-0 h-full w-full object-cover" + (dim ? " opacity-70 saturate-[0.8]" : "")}
        style={{ backgroundImage: `url(${HERO.image.blur})`, backgroundSize: "cover" }}
      />
    </picture>
  );
}

function Callout({ text, className, side = "right" }: { text: string; className: string; side?: "left" | "right" }) {
  const dot = <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--signal)] shadow-[0_0_12px_var(--signal)]" />;
  const line = <span className="h-px w-10 shrink-0 bg-[var(--signal)]" />;
  const label = (
    <span className="whitespace-nowrap rounded-md bg-black/75 px-2 py-1 font-mono text-xs font-semibold text-white backdrop-blur-sm">{text}</span>
  );
  return (
    <div className={"absolute flex items-center " + className} aria-hidden="true">
      {side === "right" ? (<>{dot}{line}{label}</>) : (<>{label}{line}{dot}</>)}
    </div>
  );
}

export default function HeroLens({ t, scanHref, demoHref }: { t: LandingContent; scanHref: string; demoHref: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    registerGsap();
    const ctx = gsap.context(() => {
      const split = new SplitText(titleRef.current, { type: "lines" });
      gsap.from(split.lines, { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const ai = aiRef.current;
    if (!stage || !ai || reducedMotion()) return;
    registerGsap();
    const fine = window.matchMedia("(pointer: fine)").matches;
    const pos = { x: 68, y: 72 };
    const render = () => ai.style.setProperty("--lens", `circle(92px at ${pos.x}% ${pos.y}%)`);
    render();
    if (fine) {
      const qx = gsap.quickTo(pos, "x", { duration: 0.35, ease: "power2.out", onUpdate: render });
      const qy = gsap.quickTo(pos, "y", { duration: 0.35, ease: "power2.out", onUpdate: render });
      const move = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        qx(((e.clientX - r.left) / r.width) * 100);
        qy(((e.clientY - r.top) / r.height) * 100);
      };
      stage.addEventListener("pointermove", move);
      return () => stage.removeEventListener("pointermove", move);
    }
    const glide = gsap.to(pos, {
      keyframes: [{ x: 68, y: 72 }, { x: 45, y: 32 }, { x: 60, y: 55 }],
      duration: 9,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      onUpdate: render,
    });
    return () => {
      glide.kill();
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#081120] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(91,155,230,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,230,0.1) 1px, transparent 1px), " +
            "linear-gradient(rgba(91,155,230,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,230,0.16) 1px, transparent 1px)",
          backgroundSize: "8px 8px, 8px 8px, 40px 40px, 40px 40px",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-[1240px] gap-8 px-5 pb-10 pt-12 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12 lg:pt-16">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--signal)]">{t.heroKicker}</p>
          <h1 ref={titleRef} className="mt-3 font-display text-5xl font-extrabold leading-[1.02] tracking-tight lg:text-6xl">
            {t.heroA} {t.heroB}
          </h1>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-white/75">{t.sub}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <MagneticButton className="rounded-btn bg-[var(--signal)] px-6 py-3 font-bold text-[var(--signal-ink)] shadow-[0_0_0_1px_rgba(255,122,46,0.4),0_8px_28px_-6px_rgba(255,122,46,0.6)]">
              <Link href={scanHref}>{t.scan}</Link>
            </MagneticButton>
            <Link href={demoHref} className="rounded-btn border border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10">
              {t.demo}
            </Link>
          </div>
        </div>
        <div className="relative">
          <div
            ref={stageRef}
            className="relative aspect-[4/3] cursor-crosshair overflow-hidden rounded-card border border-white/15 bg-[#0A1220]"
            aria-label={t.lensNote}
          >
            <HeroPhoto dim />
            <div
              ref={aiRef}
              className="absolute inset-0"
              style={{ ["--lens" as string]: "circle(110px at 68% 72%)", clipPath: "var(--lens)" }}
            >
              <HeroPhoto />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[rgba(255,122,46,0.08)]"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,122,46,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,122,46,0.18) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div aria-hidden="true" className="absolute left-[56%] top-[58%] h-[30%] w-[26%] rounded-[45%] border-2 border-[var(--signal)] bg-[rgba(255,122,46,0.25)] shadow-[0_0_24px_rgba(255,122,46,0.6)]" />
            </div>
            <Callout text={t.lensFinding} side="left" className="right-[34%] top-[70%]" />
            <Callout text={t.lensMapLabel} className="left-[44%] top-[24%]" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10" aria-hidden="true">
              <span className="rounded-md bg-[#C2410C] px-2 py-1 font-mono text-xs font-semibold text-white">{t.lensRisk}</span>
              <span className="rounded-md bg-white/15 px-2 py-1 font-mono text-xs font-semibold text-white">{t.lensTime}</span>
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1" aria-hidden="true">
              <span className="live-dot" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/85">{t.lensNote}</span>
            </div>
          </div>
          {GLASSES && (
            <figure className="absolute -bottom-6 -left-4 hidden w-56 overflow-hidden rounded-card border border-white/20 bg-[#0A1220] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] sm:block lg:-left-10">
              <picture>
                <source srcSet={GLASSES.image.avif} type="image/avif" />
                <img src={GLASSES.image.src} width={GLASSES.image.width} height={GLASSES.image.height} alt={t.glassesCaption} loading="lazy" decoding="async" className="aspect-[5/3] w-full object-cover" />
              </picture>
              <figcaption className="px-3 py-2 text-xs font-semibold leading-snug text-white/85">{t.glassesCaption}</figcaption>
            </figure>
          )}
        </div>
      </div>
      <div className="relative border-t border-white/10 bg-white/[0.02] py-3">
        <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12">
          <Marquee>
            {t.trades.map((c) => (
              <span key={c} className="whitespace-nowrap rounded-full border border-white/15 px-4 py-1 font-mono text-xs uppercase tracking-widest text-white/70">{c}</span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
