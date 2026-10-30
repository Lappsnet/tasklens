"use client";

/* U5 problem cards: tilt toward the cursor + SVG blueprint line illustrations. */

import { useRef } from "react";
import { Hourglass, Question, Warning } from "@phosphor-icons/react";
import { reducedMotion } from "./motion";

function WaitingArt() {
  return (
    <svg viewBox="0 0 200 90" className="h-20 w-full" aria-hidden="true">
      <g fill="none" stroke="var(--blueprint)" strokeWidth="1.5">
        <rect x="14" y="30" width="40" height="30" rx="2" />
        <rect x="54" y="30" width="40" height="30" rx="2" strokeDasharray="4 3" opacity="0.5" />
        <rect x="94" y="30" width="40" height="30" rx="2" strokeDasharray="4 3" opacity="0.3" />
        <rect x="134" y="30" width="52" height="30" rx="2" />
        <path d="M54 45 H94 M94 38 V52 M134 45 H134" />
        <circle cx="160" cy="45" r="10" />
        <path d="M160 38 V45 L165 48" />
      </g>
    </svg>
  );
}

function GuessArt() {
  return (
    <svg viewBox="0 0 200 90" className="h-20 w-full" aria-hidden="true">
      <g fill="none" stroke="var(--blueprint)" strokeWidth="1.5">
        <rect x="70" y="14" width="60" height="44" rx="2" />
        <path d="M70 30 H130 M86 14 V58 M114 14 V58" opacity="0.4" />
        <text x="100" y="52" textAnchor="middle" fill="var(--blueprint)" fontSize="16" fontFamily="monospace" stroke="none">$?</text>
        <path d="M40 70 H160 M40 66 V74 M160 66 V74" opacity="0.5" />
      </g>
    </svg>
  );
}

function RiskArt() {
  return (
    <svg viewBox="0 0 200 90" className="h-20 w-full" aria-hidden="true">
      <g fill="none" stroke="var(--blueprint)" strokeWidth="1.5">
        <circle cx="100" cy="40" r="24" />
        <path d="M100 28 V40 L110 46" />
        <path d="M40 40 H64 M136 40 H160" strokeDasharray="4 3" />
        <circle cx="40" cy="40" r="4" />
        <circle cx="160" cy="40" r="4" />
      </g>
    </svg>
  );
}

export default function ProblemCards({ items }: { items: { icon: string; title: string; text: string }[] }) {
  const arts = [<WaitingArt key="w" />, <GuessArt key="g" />, <RiskArt key="r" />];
  const icons = [<Hourglass key="i" size={22} weight="duotone" />, <Question key="i" size={22} weight="duotone" />, <Warning key="i" size={22} weight="duotone" />];

  function tilt(e: React.MouseEvent<HTMLElement>) {
    if (reducedMotion() || window.matchMedia("(pointer: coarse)").matches) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
  }
  function untilt(e: React.MouseEvent<HTMLElement>) {
    e.currentTarget.style.transform = "";
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((it, i) => (
        <article
          key={it.title}
          onMouseMove={tilt}
          onMouseLeave={untilt}
          className="rounded-card border border-line bg-surface p-4 shadow-soft transition-shadow duration-200 hover:shadow-lifted"
        >
          {arts[i]}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-signal" aria-hidden="true">{icons[i]}</span>
            <h3 className="font-display text-lg font-bold">{it.title}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{it.text}</p>
        </article>
      ))}
    </div>
  );
}
