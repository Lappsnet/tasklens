"use client";

/* U5 Alcaldías: dark section, stylized dot map (illustrative), triage →
   dispatch → proof flow, access-request form (017 + /api/city/access). */

import { useState } from "react";
import { Buildings } from "@phosphor-icons/react";
import { Button, Field, Input } from "@/components/ui";

function DotMap() {
  const dots: [number, number][] = [
    [52, 30], [58, 34], [64, 32], [70, 36], [55, 42], [62, 44], [68, 48],
    [48, 52], [56, 56], [64, 58], [72, 54], [60, 64], [66, 68], [52, 70],
  ];
  return (
    <svg viewBox="0 0 120 100" className="h-44 w-full" role="img" aria-label="El Salvador departments, illustrative">
      {dots.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={3.4} fill="rgba(91,155,230,0.25)" />
          <circle cx={x} cy={y} r={1.7} fill="#5B9BE6">
            <animate attributeName="opacity" values="1;0.35;1" dur={`${2 + (i % 4) * 0.7}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}

export default function CitySection({ t }: {
  t: {
    citiesT: string; citiesSub: string; citiesFlow: string[];
    accessCta: string; accessTitle: string; accessSent: string;
    muniPh: string; namePh: string; rolePh: string; emailLabel: string; sendLink: string;
  };
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
          <DotMap />
        </div>
        <div className="rounded-card bg-white/[0.04] p-5 backdrop-blur">
          {sent ? (
            <p className="font-bold text-verified" role="status">✓ {t.accessSent}</p>
          ) : (
            <>
              <h3 className="font-display text-xl font-bold">{t.accessCta}</h3>
              <div className="mt-3 space-y-3">
                <Field label={t.muniPh}>
                  <Input value={muni} onChange={(e) => setMuni(e.target.value)} maxLength={120} className="border-white/20 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                <Field label={t.namePh}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="border-white/20 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                <Field label={t.rolePh}>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} className="border-white/20 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                <Field label={t.emailLabel}>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" maxLength={200} className="border-white/20 bg-white/5 text-white placeholder:text-white/40" />
                </Field>
                {error && <p className="err" role="alert">Revisa los campos / Check the fields.</p>}
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
