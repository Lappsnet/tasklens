"use client";

/* U5 Alcaldías: dark section, stylized dot map (illustrative), triage →
   dispatch → proof flow, access-request form (017 + /api/city/access). */

import { useState } from "react";
import { Buildings } from "@phosphor-icons/react";
import { Button, ErrorState, Field, Input } from "@/components/ui";
import { CATEGORIES, SHOWCASE_JOBS } from "@/content/showcase";

/** Mini SLA chart from seeded demo data: open municipal reports by category. */
function SlaBar({ lang }: { lang: "es" | "en" }) {
  const rows = Object.entries(
    SHOWCASE_JOBS.filter((j) => j.scope === "municipal" && j.status === "reported").reduce<Record<string, number>>((acc, j) => {
      acc[j.category] = (acc[j.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = rows[0]?.[1] ?? 1;
  return (
    <div role="img" aria-label={lang === "es" ? "Reportes abiertos por categoría, datos de demostración" : "Open reports by category, demo data"}>
      <ol className="mt-4 space-y-2.5">
        {rows.map(([cat, n]) => (
          <li key={cat}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold text-white/85">{CATEGORIES[cat as keyof typeof CATEGORIES][lang]}</span>
              <span className="font-mono tabular-nums text-white/60">{n}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--signal)]" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-white/40">
        {lang === "es" ? "Datos de demostración" : "Demo data"}
      </p>
    </div>
  );
}

export default function CitySection({ t, lang = "es" }: {
  t: {
    citiesT: string; citiesSub: string; citiesFlow: string[];
    accessCta: string; accessTitle: string; accessSent: string;
    muniPh: string; namePh: string; rolePh: string; emailLabel: string; sendLink: string;
  };
  lang?: "es" | "en";
}) {
  const [muni, setMuni] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (muni.trim().length < 2 || name.trim().length < 2 || role.trim().length < 2 || !email.includes("@")) {
      setError("error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/city/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality: muni.trim(), name: name.trim(), role: role.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-card bg-[#081120] p-6 text-white lg:p-10" aria-label={t.citiesT}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(91,155,230,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,230,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--signal)]">
            <Buildings size={18} aria-hidden="true" weight="duotone" /> {t.citiesT}
          </p>
          <p className="mt-3 max-w-[52ch] text-white/75">{t.citiesSub}</p>
          <ol className="mt-4 space-y-2">
            {t.citiesFlow.map((f, i) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs font-bold">{i + 1}</span>
                {f}
              </li>
            ))}
          </ol>
          <SlaBar lang={lang} />
          <ul className="mt-4 grid grid-cols-3 gap-2" aria-label={t.citiesT}>
            {SHOWCASE_JOBS.filter((j) => j.scope === "municipal" && j.status === "reported").slice(0, 3).map((j) => (
              <li key={j.id} className="overflow-hidden rounded-card border border-white/10 bg-white/[0.04]">
                <img
                  src={j.image.src}
                  width={j.image.width}
                  height={j.image.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
                <p className="px-2 py-1.5 text-[11px] font-semibold leading-tight text-white/80">{j.title[lang]}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card bg-white/[0.04] p-5 backdrop-blur">
          {sent ? (
            <p className="font-bold text-verified" role="status">✓ {t.accessSent}</p>
          ) : (
            <>
              <h3 className="font-display text-xl font-bold">{t.accessCta}</h3>
              <div className="mt-3 space-y-3">
                <Field label={t.muniPh} tone="dark">
                  <Input value={muni} onChange={(e) => setMuni(e.target.value)} maxLength={120} placeholder={t.muniPh} className="border-white/15 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                <Field label={t.namePh} tone="dark">
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t.namePh} className="border-white/15 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                <Field label={t.rolePh} tone="dark">
                  <Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder={t.rolePh} className="border-white/15 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                <Field label={t.emailLabel} tone="dark">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" maxLength={200} placeholder="nombre@municipio.gob.sv" className="border-white/15 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                {error && <ErrorState message="Revisa los campos / Check the fields." />}
                <Button variant="accent" loading={busy} onPress={submit}>
                  {t.accessTitle}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
