"use client";

/* U6 feature visuals: blueprint-styled product illustrations per slug.
   Placeholders until owner screenshots land (no fake screenshots). */

import { Annotation, DimensionLine, ScanBeam, StampSeal, Viewfinder } from "@/components/blueprint";

export default function FeatureVisual({ slug }: { slug: string }) {
  switch (slug) {
    case "escaneo":
    case "verificacion":
    case "copiloto":
      return (
        <Viewfinder animate>
          <div className="relative aspect-[4/3] bg-ink">
            <div className="absolute left-[28%] top-[22%] h-16 w-24 rounded bg-[var(--signal)]/60" aria-hidden="true" />
            <ScanBeam />
            <Annotation x={60} y={30} label={slug === "copiloto" ? "Sellador OK" : "$120–220"} />
            {slug === "verificacion" && <Annotation x={30} y={65} label="✓ verificado" side="left" />}
          </div>
        </Viewfinder>
      );
    case "contratos":
      return (
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">Contrato de servicio · ES/EN</div>
          <div className="mt-2 space-y-2" aria-hidden="true">
            <div className="h-2.5 w-11/12 rounded bg-ink/15" />
            <div className="h-2.5 w-full rounded bg-ink/10" />
            <div className="h-2.5 w-4/5 rounded bg-ink/10" />
            <div className="h-2.5 w-full rounded bg-ink/10" />
            <div className="h-2.5 w-3/5 rounded bg-ink/15" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-xs text-muted">SHA-256 · 9f3a…</span>
            <StampSeal text="Firmado" />
          </div>
        </div>
      );
    case "pago":
    case "extranjero":
      return (
        <div className="rounded-card border border-signal bg-surface p-5 text-center shadow-lifted">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">Garantía retenida</div>
          <div className="mt-1 font-display text-4xl font-extrabold">$170</div>
          <DimensionLine label="autorizado · no capturado" className="mt-2" />
        </div>
      );
    case "planificador":
      return (
        <div className="space-y-2">
          {["Demolición", "Fontanería", "Electricidad", "Pintura"].map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-28 truncate text-xs font-bold">{p}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div className={`h-full rounded-full ${i < 2 ? "bg-verified" : i === 2 ? "bg-signal" : "bg-ink/25"}`} style={{ width: `${90 - i * 18}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    case "pasaporte":
      return (
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">Pasaporte del hogar</div>
          <div className="mt-2 grid grid-cols-2 gap-2" aria-hidden="true">
            <div className="aspect-square rounded bg-ink/10" />
            <div className="aspect-square rounded bg-verified/25" />
          </div>
          <div className="mt-2 text-sm">Garantía hasta <strong>2027-03-14</strong></div>
        </div>
      );
    case "calendario":
      return (
        <div className="grid grid-cols-7 gap-1" aria-hidden="true">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded ${[3, 9, 10, 16].includes(i) ? "bg-signal" : "bg-ink/10"}`} />
          ))}
        </div>
      );
    case "mediacion":
      return (
        <div className="rounded-card border border-line bg-surface p-5 text-center">
          <div className="font-display text-xl font-extrabold">70% liberar · 30% retener</div>
          <DimensionLine label="propuesta IA · deciden humanos" className="mt-2" />
        </div>
      );
    default:
      return (
        <Viewfinder animate>
          <div className="relative aspect-[4/3] bg-ink">
            <ScanBeam />
            <Annotation x={55} y={45} label="Reporte triageado" />
          </div>
        </Viewfinder>
      );
  }
}
