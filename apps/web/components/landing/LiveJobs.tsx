"use client";

/* "Trabajos en vivo": the showcase of demo jobs (content/showcase.ts), filterable by
   who it's for (home / municipality) and by stage (reported / in progress / done).
   Every card is a demo example and the section says so. */

import { useMemo, useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  Barricade, Broom, Bug, Car, CheckCircle, CloudRain, Door, Drop, Hammer, House, Lamp, Lightning,
  PaintBrush, Path, Plant, SquaresFour, Stairs, TrafficSignal, Trash, Tree, Warning, Wrench,
} from "@phosphor-icons/react";
import { cn } from "@/components/cn";
import {
  CATEGORIES, SHOWCASE_COPY, SHOWCASE_JOBS, STATUS_LABEL,
  type ShowcaseCategory, type ShowcaseJob, type ShowcaseScope, type ShowcaseStatus,
} from "@/content/showcase";

type Lang = "es" | "en";

const ICONS: Record<ShowcaseCategory, Icon> = {
  electrical: Lightning, plumbing: Drop, roofing: House, glass_windows: SquaresFour, carpentry_locks: Door,
  masonry_walls: Hammer, flooring: SquaresFour, ceilings_drywall: PaintBrush, pest_control: Bug,
  street_lighting: Lamp, storm_drains: Drop, roads_potholes: Barricade, road_markings: Path,
  traffic_signals: TrafficSignal, fallen_trees: Tree, flooding: CloudRain, solid_waste: Trash,
  parks_playgrounds: Plant, sidewalks: Stairs, graffiti: Broom, abandoned_vehicles: Car,
  debris: Wrench, power_lines: Lightning, water_leaks: Drop,
};

const STATUS_STYLE: Record<ShowcaseStatus, string> = {
  reported: "bg-[#1F4E8C] text-white",
  in_progress: "bg-[var(--signal)] text-[var(--signal-ink)]",
  done: "bg-[var(--verified)] text-white",
};

const STATUSES: ShowcaseStatus[] = ["reported", "in_progress", "done"];
const PAGE = 12;

export default function LiveJobs({ lang }: { lang: Lang }) {
  const c = SHOWCASE_COPY[lang];
  const [scope, setScope] = useState<ShowcaseScope | "all">("all");
  const [status, setStatus] = useState<ShowcaseStatus | "all">("all");
  const [shown, setShown] = useState(PAGE);

  const inScope = useMemo(() => SHOWCASE_JOBS.filter((j) => scope === "all" || j.scope === scope), [scope]);
  const counts = useMemo(() => {
    const out: Record<ShowcaseStatus, number> = { reported: 0, in_progress: 0, done: 0 };
    inScope.forEach((j) => (out[j.status] += 1));
    return out;
  }, [inScope]);
  const list = useMemo(
    () => inScope.filter((j) => status === "all" || j.status === status),
    [inScope, status],
  );

  const pick = <T,>(set: (v: T) => void, v: T) => {
    set(v);
    setShown(PAGE);
  };

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[46rem]">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">{c.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight lg:text-5xl">{c.title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">{c.lead}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted">
          <span className="h-2 w-2 rounded-full bg-[var(--warning)]" aria-hidden="true" />
          {c.demoLabel}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label={c.eyebrow}>
          {(["all", "home", "municipal"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => pick(setScope, s)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150",
                scope === s ? "bg-ink text-bg" : "text-muted hover:text-ink",
              )}
            >
              {s === "all" ? c.all : s === "home" ? c.home : c.municipal}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => pick(setStatus, status === s ? "all" : s)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150",
                status === s ? "border-transparent " + STATUS_STYLE[s] : "border-line bg-surface text-ink hover:border-ink/30",
              )}
            >
              {STATUS_LABEL[s][lang]}
              <span className={cn("rounded-full px-2 text-xs tabular-nums", status === s ? "bg-black/15" : "bg-bg text-muted")}>{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-line p-10 text-center text-muted">{c.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.slice(0, shown).map((j) => (
            <JobCard key={j.id} job={j} lang={lang} />
          ))}
        </ul>
      )}

      {shown < list.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-btn border border-ink px-6 py-3 font-bold transition-colors duration-150 hover:bg-ink hover:text-bg"
          >
            {c.more} ({list.length - shown})
          </button>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, lang }: { job: ShowcaseJob; lang: Lang }) {
  const c = SHOWCASE_COPY[lang];
  const cat = CATEGORIES[job.category];
  const CatIcon = ICONS[job.category];
  const safety = job.flags.includes("safety");
  return (
    <li className="group overflow-hidden rounded-[20px] border border-line bg-surface transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted">
      <div className="relative aspect-[4/3] overflow-hidden bg-bg">
        <picture>
          <source srcSet={job.image.avif} type="image/avif" />
          <img
            src={job.image.src}
            width={job.image.width}
            height={job.image.height}
            alt={job.title[lang]}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ backgroundImage: `url(${job.image.blur})`, backgroundSize: "cover" }}
          />
        </picture>
        <span className={cn("absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm", STATUS_STYLE[job.status])}>
          {job.status === "in_progress" && <span className="live-dot" aria-hidden="true" />}
          {job.status === "done" && <CheckCircle weight="fill" aria-hidden="true" />}
          {STATUS_LABEL[job.status][lang]}
        </span>
        {safety && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
            <Warning weight="fill" className="text-[#FB923C]" aria-hidden="true" />
            {c.safety}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          <CatIcon weight="duotone" className="text-base text-[var(--blueprint)]" aria-hidden="true" />
          {cat[lang]}
        </p>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug">{job.title[lang]}</h3>
        <p className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-bg px-2.5 py-1 text-muted">{job.scope === "home" ? c.home : c.municipal}</span>
          {cat.owner === "utility" && <span className="rounded-full bg-bg px-2.5 py-1 text-muted">{c.utility}</span>}
        </p>
      </div>
    </li>
  );
}
