"use client";

/* U5 Cómo funciona: horizontal pinned scroll on desktop, vertical stack mobile. */

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Eyeglasses, Microphone, PenNib, ShieldCheck } from "@phosphor-icons/react";
import { SHOWCASE_JOBS } from "@/content/showcase";
import { reducedMotion, registerGsap } from "./motion";

const ICONS: Record<string, typeof Eyeglasses> = {
  eye: Eyeglasses,
  mic: Microphone,
  sign: PenNib,
  check: ShieldCheck,
};

/** One real photo per step: look (reported), speak (work in progress),
    sign (a finished job on paper), verify (a verified done job). */
function stepPhoto(i: number) {
  const clean = SHOWCASE_JOBS.filter((j) => !j.flags.includes("faces"));
  const reported = clean.find((j) => j.status === "reported") ?? SHOWCASE_JOBS[0];
  const progress = clean.find((j) => j.status === "in_progress") ?? SHOWCASE_JOBS[0];
  const dones = SHOWCASE_JOBS.filter((j) => j.status === "done");
  const done = dones[0] ?? SHOWCASE_JOBS[0];
  const done2 = dones[1] ?? done;
  return [reported, progress, done, done2][Math.min(i, 3)];
}

export default function HowSteps({ steps, scanHref, tryNow }: { steps: { icon: string; label: string; text: string }[]; scanHref: string; tryNow: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current || !pinRef.current || reducedMotion()) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    registerGsap();
    const ctx = gsap.context(() => {
      const track = trackRef.current as HTMLDivElement;
      const getX = () => -(track.scrollWidth - window.innerWidth + 64);
      gsap.to(track, {
        x: getX,
        ease: "none",
        scrollTrigger: {
          trigger: pinRef.current,
          start: "top top+=72",
          end: () => `+=${track.scrollWidth - window.innerWidth + 200}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pinRef} className="lg:overflow-hidden">
      <div ref={trackRef} className="relative grid gap-3 sm:grid-cols-2 lg:flex lg:w-max lg:gap-6">
        <div aria-hidden="true" className="absolute left-0 right-8 top-5 hidden h-px bg-line lg:block" />
        {steps.map((s, i) => {
          const Ico = ICONS[s.icon] ?? ShieldCheck;
          const photo = stepPhoto(i);
          return (
            <article key={s.label} className="relative rounded-card border border-line bg-surface p-5 shadow-soft lg:w-[380px] lg:shrink-0">
              <div className="relative -m-5 mb-4 aspect-[16/10] overflow-hidden rounded-t-card bg-bg">
                <picture>
                  <source srcSet={photo.image.avif} type="image/avif" />
                  <img
                    src={photo.image.src}
                    width={photo.image.width}
                    height={photo.image.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    style={{ backgroundImage: `url(${photo.image.blur})`, backgroundSize: "cover" }}
                  />
                </picture>
              </div>
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ink font-mono text-sm font-bold text-bg">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Ico size={28} weight="duotone" className="text-signal" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-display text-2xl font-extrabold">{s.label}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
              {i === 0 && (
                <Link href={scanHref} className="mt-3 inline-block rounded-btn bg-ink px-4 py-2 text-sm font-bold text-bg">
                  {tryNow}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
