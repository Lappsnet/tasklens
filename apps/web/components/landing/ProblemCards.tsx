"use client";

/* U5 problem cards: tilt toward the cursor + SVG blueprint line illustrations. */

import { Hourglass, Question, Warning } from "@phosphor-icons/react";

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

  return (
    <ol className="divide-y divide-line border-y border-line">
      {items.map((it, i) => (
        <li key={it.title} className="grid gap-4 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
          <div className="max-w-[44rem]">
            <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
              <span className="text-signal" aria-hidden="true">{icons[i]}</span>
              {it.title}
            </h3>
            <p className="mt-2 text-lg leading-relaxed text-muted">{it.text}</p>
          </div>
          <div className="hidden w-48 shrink-0 sm:block" aria-hidden="true">{arts[i]}</div>
        </li>
      ))}
    </ol>
  );
}
