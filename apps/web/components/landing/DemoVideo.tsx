"use client";

/* U5 demo video block: 16:9 viewfinder frame, chapters, YouTube-nocookie on
   click or self-hosted MP4; tasteful empty state when no source is set. */

import { useState } from "react";
import { Play } from "@phosphor-icons/react";
import type { DemoVideoConfig } from "@/content/landing.es";
import { Viewfinder } from "@/components/blueprint";

export default function DemoVideo({ title, soon, soonBody, config }: {
  title: string;
  soon: string;
  soonBody: string;
  config: DemoVideoConfig;
}) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = config.provider === "youtube" || config.provider === "file";

  return (
    <div>
      <h2 className="font-display text-2xl font-bold lg:text-3xl">{title}</h2>
      <Viewfinder className="mt-4 border border-line bg-ink" animate={false}>
        <div className="relative aspect-video">
          {!hasVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink p-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 text-white/80">
                <Play size={28} weight="fill" aria-hidden="true" />
              </span>
              <p className="font-display text-xl font-bold text-white">{soon}</p>
              <p className="max-w-[46ch] text-sm text-white/70">{soonBody}</p>
            </div>
          )}
          {hasVideo && !playing && (
            <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/80" aria-label={title}>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-signal text-[var(--signal-ink)] transition hover:scale-105">
                <Play size={28} weight="fill" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold text-white">{title}</span>
            </button>
          )}
          {hasVideo && playing && config.provider === "youtube" && (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${config.id}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {hasVideo && playing && config.provider === "file" && (
            <video className="absolute inset-0 h-full w-full" src={config.src} controls autoPlay playsInline />
          )}
        </div>
      </Viewfinder>
      <div className="mt-2 flex flex-wrap gap-2">
        {config.chapters.map((c) => (
          <span key={c.t} className="rounded-btn border border-line bg-surface px-3 py-1.5 font-mono text-xs">
            {c.t} · {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
