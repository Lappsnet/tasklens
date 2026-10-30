"use client";

/* U5 Meta AI cards, each with a micro demo (waveform / render shimmer /
   mask draw / scan tick / glasses beam). */

import { Eyeglasses, Microphone, PaintBrush, Scan, SquaresFour } from "@phosphor-icons/react";

function Micro({ kind }: { kind: string }) {
  if (kind === "wave") {
    return (
      <div className="flex h-10 items-center gap-1" aria-hidden="true">
        {[10, 18, 26, 14, 22, 30, 16, 24, 12, 20, 28, 15].map((h, i) => (
          <span key={i} className="w-1 rounded-full bg-[var(--signal)]" style={{ height: h, animation: `tickUp 0.9s ease-in-out ${i * 0.08}s infinite alternate`, opacity: 0.85 }} />
        ))}
        <style>{`@keyframes tickUp { from { transform: scaleY(0.5); } to { transform: scaleY(1.15); } }`}</style>
      </div>
    );
  }
  if (kind === "mask") {
    return (
      <div className="relative h-10 overflow-hidden rounded bg-ink" aria-hidden="true">
        <div className="damagebox" style={{ left: "30%", top: "20%", width: "40%", height: "55%" }} />
      </div>
    );
  }
  if (kind === "render") {
    return <div className="skel h-10 rounded" aria-hidden="true" />;
  }
  if (kind === "glasses") {
    return (
      <div className="relative h-10 overflow-hidden rounded bg-ink" aria-hidden="true">
        <div className="scan-beam" style={{ animationDuration: "3s" }} />
      </div>
    );
  }
  return (
    <div className="flex h-10 items-center gap-2 font-mono text-xs text-verified" aria-hidden="true">
      <Scan size={18} aria-hidden="true" /> $120–220 · 1.5 h ✓
    </div>
  );
}

const ICONS = [Scan, Microphone, PaintBrush, SquaresFour, Eyeglasses];

export default function MetaCards({ title, cards }: {
  title: string;
  cards: { title: string; text: string; micro: string }[];
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold lg:text-3xl">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => {
          const Ico = ICONS[i % ICONS.length];
          return (
            <article key={c.title} className="rounded-card border border-line bg-surface p-4 shadow-soft">
              <Ico size={24} weight="duotone" className="text-blueprint" aria-hidden="true" />
              <h3 className="mt-2 font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.text}</p>
              <div className="mt-3"><Micro kind={c.micro} /></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
