"use client";

/* U5 Meta AI cards, each with a micro demo (waveform / render shimmer /
   mask draw / scan tick / glasses beam). */

import { Eyeglasses, Microphone, PaintBrush, Scan, SquaresFour } from "@phosphor-icons/react";
import { BRAND_IMAGES, SHOWCASE_JOBS } from "@/content/showcase";

const SAM_PHOTO = SHOWCASE_JOBS.find((j) => j.id === "tomacorriente-derretido") ?? SHOWCASE_JOBS[0];
const GLASSES_POV = BRAND_IMAGES[0];

function Micro({ kind, voiceSample }: { kind: string; voiceSample: string }) {
  if (kind === "wave") {
    return (
      <div aria-hidden="true">
        <div className="flex h-10 items-center gap-1">
          {[10, 18, 26, 14, 22, 30, 16, 24, 12, 20, 28, 15].map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-[var(--signal)]" style={{ height: h, animation: `tickUp 0.9s ease-in-out ${i * 0.08}s infinite alternate`, opacity: 0.85 }} />
          ))}
          <style>{`@keyframes tickUp { from { transform: scaleY(0.5); } to { transform: scaleY(1.15); } }`}</style>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-muted">“{voiceSample}”</p>
      </div>
    );
  }
  if (kind === "scan") {
    return (
      <pre className="overflow-x-auto rounded bg-ink p-2.5 font-mono text-[10px] leading-relaxed text-white" aria-label="Ejemplo de especificación IA">
{`{
  "category": "electrical",
  "price_usd": [120, 220],
  "steps": 3,
  "confidence": 0.82
}`}
      </pre>
    );
  }
  // Muse Image: omitted until a real generation exists (no invented previews).
  if (kind === "render") return null;
  if (kind === "mask" && SAM_PHOTO) {
    return (
      <div className="relative h-24 overflow-hidden rounded bg-ink" aria-hidden="true">
        <img src={SAM_PHOTO.image.src} width={SAM_PHOTO.image.width} height={SAM_PHOTO.image.height} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90" />
        <div className="absolute rounded-md border-[3px] border-[#FF7A2E] bg-[rgba(255,122,46,0.25)] shadow-[0_0_16px_rgba(255,122,46,0.7)]" style={{ left: "55%", top: "45%", width: "32%", height: "40%" }} />
        <span className="absolute left-[38%] top-[30%] whitespace-nowrap rounded bg-black/70 px-1 py-0.5 font-mono text-[10px] font-semibold text-white">$120–220</span>
      </div>
    );
  }
  if (kind === "glasses" && GLASSES_POV) {
    return (
      <div className="relative h-24 overflow-hidden rounded bg-ink" aria-hidden="true">
        <img src={GLASSES_POV.image.src} width={GLASSES_POV.image.width} height={GLASSES_POV.image.height} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-signal px-2.5 py-1 text-[11px] font-bold text-[var(--signal-ink)]">Fix this</span>
      </div>
    );
  }
  return null;
}

const ICONS = [Scan, Microphone, PaintBrush, SquaresFour, Eyeglasses];

export default function MetaCards({ title, cards, voiceSample }: {
  title: string;
  cards: { title: string; text: string; micro: string }[];
  voiceSample: string;
}) {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold lg:text-[40px] lg:leading-[1.05]">{title}</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => {
          const Ico = ICONS[i % ICONS.length];
          return (
            <article key={c.title} className="rounded-card border border-line bg-surface p-4 shadow-soft">
              <Ico size={24} weight="duotone" className="text-blueprint" aria-hidden="true" />
              <h3 className="mt-2 font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.text}</p>
              <div className="mt-3"><Micro kind={c.micro} voiceSample={voiceSample} /></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
