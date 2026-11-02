import { Annotation } from "@/components/blueprint";
import type { ShowcaseJob } from "@/content/showcase";

/* V4 "Qué ve la IA": the demo photo with a SAM-style mask and annotation
   callouts. Always labelled as a demo example (photos didn't come through
   TaskLens). Server component. */

export default function AnnotatedPhoto({
  job,
  annotations,
  safety,
  demoLabel,
  mask = { x: 30, y: 28, w: 40, h: 30 },
}: {
  job: ShowcaseJob;
  annotations: string[];
  safety?: string;
  demoLabel: string;
  mask?: { x: number; y: number; w: number; h: number };
}) {
  const spots = [
    { x: 34, y: 30, side: "right" as const },
    { x: 62, y: 58, side: "left" as const },
    { x: 44, y: 72, side: "right" as const },
  ];
  return (
    <figure>
      <div className="relative overflow-hidden rounded-card border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.image.src}
          width={job.image.width}
          height={job.image.height}
          alt={job.title.es}
          loading="lazy"
          decoding="async"
          className="block w-full"
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <ellipse
            cx={mask.x + mask.w / 2}
            cy={mask.y + mask.h / 2}
            rx={mask.w / 2}
            ry={mask.h / 2}
            fill="rgba(242,106,27,0.22)"
            stroke="#FF7A2E"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {annotations.slice(0, 3).map((label, i) => (
          <Annotation key={label} x={spots[i].x} y={spots[i].y} side={spots[i].side} label={label} />
        ))}
      </div>
      {safety && (
        <p role="note" className="mt-2 rounded-btn border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {safety}
        </p>
      )}
      <figcaption className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
        {demoLabel}
      </figcaption>
    </figure>
  );
}
