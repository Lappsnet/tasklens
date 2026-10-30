"use client";

/* U5 hero: dark blueprint, SplitText headline, "The Lens" — a cursor-following
   circular AI view (SAM mask + annotations + grid) over a site drawing.
   Mobile auto-glides. 2D only (3D variant cut per spec when time runs short). */

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { MagneticButton } from "@/components/blueprint";
import { Marquee } from "@/components/blueprint";
import type { LandingContent } from "@/content/landing.es";
import { reducedMotion, registerGsap, useLenis } from "./motion";

function SinkDrawing({ ai }: { ai?: boolean }) {
  const stroke = ai ? "#FF7A2E" : "#5B9BE6";
  const faint = ai ? "rgba(255,122,46,0.35)" : "rgba(91,155,230,0.4)";
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="damaged sink drawing">
      <rect x="20" y="20" width="360" height="260" fill="none" stroke={faint} strokeWidth="1" strokeDasharray="6 4" />
      <rect x="90" y="60" width="220" height="26" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="90" y="86" width="220" height="10" fill={faint} />
      <path d="M185 96 V150 H215 V176" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <path d="M185 150 Q185 176 205 176 Q225 176 225 162" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      {ai && <path d="M178 143 Q178 183 206 183 Q232 183 232 160 L232 150 L178 150 Z" fill="rgba(255,122,46,0.28)" stroke="#FF7A2E" strokeWidth="2" />}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="216" cy={190 + i * 14} r={2.4 - i * 0.5} fill={stroke} opacity={0.9 - i * 0.25} />
        </g>
      ))}
      <path d="M150 230 H250 M150 226 V234 M250 226 V234" stroke={faint} strokeWidth="1" />
      <text x="200" y="224" textAnchor="middle" fill={stroke} fontSize="11" fontFamily="monospace">1.5 in</text>
      <text x="34" y="46" fill={faint} fontSize="11" fontFamily="monospace">BAÑO · PARED NORTE</text>
    </svg>
  );
}

export default function HeroLens({ t, scanHref, demoHref }: { t: LandingContent; scanHref: string; demoHref: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useLenis(true);

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
    const pos = { x: 65, y: 45 };
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
      keyframes: [{ x: 30, y: 60 }, { x: 65, y: 40 }, { x: 45, y: 68 }],
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
      <div className="relative mx-auto grid w-full max-w-[1280px] gap-8 px-4 pb-10 pt-12 lg:grid-cols-2 lg:items-center lg:pt-16">
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
        <div
          ref={stageRef}
          className="relative aspect-[4/3] cursor-crosshair overflow-hidden rounded-card border border-white/15"
          aria-label={t.lensNote}
        >
          <div className="absolute inset-0 bg-[#0A1220] p-4">
            <SinkDrawing />
          </div>
          <div
            ref={aiRef}
            className="absolute inset-0 bg-[#0d1526]/95 p-4"
            style={{ ["--lens" as string]: "circle(92px at 65% 45%)", clipPath: "var(--lens)" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage: "linear-gradient(rgba(255,122,46,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,122,46,0.12) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <SinkDrawing ai />
            <div className="absolute left-[52%] top-[30%] flex items-center gap-0" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
              <span className="h-px w-8 bg-[var(--signal)]" />
              <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">Sifón corroído</span>
            </div>
            <div className="absolute left-[46%] top-[62%] flex items-center gap-0" aria-hidden="true">
              <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">$120–220</span>
              <span className="h-px w-8 bg-[var(--signal)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
            </div>
            <div className="absolute bottom-[10%] left-[30%] font-mono text-[11px] font-semibold text-[var(--signal)]" aria-hidden="true">1.5 h · fuga activa</div>
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-2" aria-hidden="true">
            <span className="live-dot" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">{t.lensNote}</span>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10 bg-white/[0.02] py-3">
        <div className="mx-auto w-full max-w-[1280px] px-4">
          <Marquee>
            {["Fontanería", "Electricidad", "Albañilería", "Limpieza", "Ensamblaje", "Climatización", "Pintura", "Jardinería"].map((c) => (
              <span key={c} className="whitespace-nowrap rounded-full border border-white/15 px-4 py-1 font-mono text-xs uppercase tracking-widest text-white/70">{c}</span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
