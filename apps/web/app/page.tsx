"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { initialLang } from "@/lib/lang";

type Lang = "en" | "es";

const C: Record<Lang, Record<string, string>> = {
  es: {
    heroKicker: "Para tu hogar en El Salvador",
    hero: "Tu reparación, cotizada en segundos. No en semanas.",
    sub: "Mira el problema con tus lentes Meta o tu celular, descríbelo en voz alta y TaskLens te conecta con un profesional verificado. Tu pago queda protegido hasta que el trabajo esté verificado.",
    scan: "Escanear un problema",
    pro: "Soy profesional",
    p1t: "El problema hoy",
    p1aT: "Esperar", p1a: "Las solicitudes pasan por una oficina central o una sola empresa; la visita tarda días o semanas.",
    p1bT: "Adivinar", p1b: "No sabes cuánto costará hasta que alguien venga a ver.",
    p1cT: "Arriesgar", p1c: "Encontrar mano de obra calificada y confiable depende de recomendaciones, y pagas por adelantado sin garantía.",
    tvsT: "Hoy vs. con TaskLens",
    tvsNote: "ilustrativo",
    tvsToday: "Hoy: reportas → esperas la visita → esperas la cotización → esperas la reparación.",
    tvsLens: "TaskLens: escaneas (1 min) → cotización (segundos) → reservado hoy → pagas solo cuando está verificado.",
    how: "Cómo funciona",
    s1: "Mira", s2: "Habla", s3: "Reserva", s4: "Verifica",
    prosT: "Para profesionales",
    pros: "Trabajos sin intermediarios, un alcance claro con fotos antes de llegar, pago garantizado por garantía bloqueada y calificaciones que construyen tu reputación.",
    join: "Únete como profesional",
    trustT: "Confianza y seguridad",
    trust: "Retención de pago en garantía, verificación IA de fotos antes/después, profesionales verificados y alertas automáticas de seguridad (gas, electricidad, estructura) que derivan a profesionales licenciados.",
    catT: "Categorías",
    metaT: "Hecho con IA de Meta",
    meta1: "Muse Spark: entiende fotos y voz y redacta la cotización y el contrato.",
    meta2: "Muse Voice Transcribe: convierte tu voz en texto, en español e inglés.",
    meta3: "Muse Image: genera el adelanto del después.",
    meta4: "Segment Anything Model: resalta el daño en la foto.",
    meta5: "Lentes Meta Ray-Ban: mira el problema y habla manos libres.",
    faqT: "Preguntas frecuentes",
    q1: "¿El precio es exacto?", a1: "Es un rango conservador calculado por IA; el profesional confirma el alcance antes de firmar el contrato.",
    q2: "¿Y si el trabajo sale mal?", a2: "El pago queda retenido hasta que la verificación de fotos pase. Si algo falla, pides corrección o se libera parcialmente.",
    q3: "¿Cómo se verifican los profesionales?", a3: "Identidad revisada manualmente, trabajos verificados y calificaciones públicas construyen su reputación.",
    q4: "¿Cómo pago?", a4: "Con PayPal o tarjeta de débito/crédito. En El Salvador todo es en USD.",
    q5: "¿Qué países?", a5: "Hoy operamos en El Salvador, con profesionales también en EE. UU. para demostraciones.",
    ctaT: "Mira el problema. Resuélvelo hoy.",
    footer: "TaskLens 2026",
    privacyLink: "Privacidad",
    termsLink: "Términos",
  },
  en: {
    heroKicker: "For your home in El Salvador",
    hero: "Your repair, quoted in seconds. Not in weeks.",
    sub: "Look at the problem with your Meta glasses or phone, describe it out loud, and TaskLens connects you with a verified pro. Your payment stays protected until the work is verified.",
    scan: "Scan a problem",
    pro: "I'm a pro",
    p1t: "The problem today",
    p1aT: "Wait", p1a: "Requests go through one central office or company; the visit takes days or weeks.",
    p1bT: "Guess", p1b: "You don't know the price until someone comes to look.",
    p1cT: "Risk", p1c: "Finding skilled, trusted labor depends on word of mouth, and you pay upfront with no guarantee.",
    tvsT: "Today vs. with TaskLens",
    tvsNote: "illustrative",
    tvsToday: "Today: report → wait for a visit → wait for a quote → wait for the repair.",
    tvsLens: "TaskLens: scan (1 min) → quote (seconds) → booked today → pay only when verified.",
    how: "How it works",
    s1: "Look", s2: "Speak", s3: "Book", s4: "Verify",
    prosT: "For pros",
    pros: "Jobs without middlemen, a clear spec with photos before you arrive, payment guaranteed by escrow, and ratings that build your reputation.",
    join: "Join as a pro",
    trustT: "Trust & safety",
    trust: "Escrow hold, AI verification of before/after photos, verified pros, and automatic safety flags (gas, electricity, structure) routed to licensed pros.",
    catT: "Categories",
    metaT: "Built with Meta AI",
    meta1: "Muse Spark: reads photos and voice, drafts the quote and contract.",
    meta2: "Muse Voice Transcribe: turns your voice into text, in Spanish and English.",
    meta3: "Muse Image: renders the after preview.",
    meta4: "Segment Anything Model: highlights the damage in the photo.",
    meta5: "Ray-Ban Meta glasses: look at the problem, talk hands-free.",
    faqT: "FAQ",
    q1: "Is the price exact?", a1: "It's a conservative AI range; the pro confirms scope before you both sign the contract.",
    q2: "What if the work is bad?", a2: "Payment stays held until photo verification passes. If something is wrong, request a fix or a partial release.",
    q3: "How are pros vetted?", a3: "Manually reviewed ID, verified jobs and public ratings build their reputation.",
    q4: "How do I pay?", a4: "With PayPal or debit/credit card. In El Salvador everything is USD.",
    q5: "Which countries?", a5: "We operate in El Salvador today, with pros also in the US for demos.",
    ctaT: "Look at the problem. Fix it today.",
    footer: "TaskLens 2026",
    privacyLink: "Privacy",
    termsLink: "Terms",
  },
};

const CATS = ["plumbing", "electrical", "appliances", "drywall & paint", "construction & masonry", "assembly", "cleaning", "installations & appointments"];

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    setLang(saved === "en" ? "en" : "es");
  }, []);
  const t = C[lang];
  const toggle = () => {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    try {
      window.localStorage.setItem("tasklens:lang", next);
      document.cookie = `tasklens:lang=${next}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="font-body text-ink">
      <div className="flex justify-end">
        <button onClick={toggle} className="text-sm underline" aria-label="language">{lang === "es" ? "EN" : "ES"}</button>
      </div>

      <section className="py-10">
        <p className="text-sm font-bold tracking-wide text-accent uppercase">{t.heroKicker}</p>
        <h1 className="font-display font-extrabold text-4xl leading-tight mt-2">{t.hero}</h1>
        <p className="mt-3 text-slate2">{t.sub}</p>
        <div className="flex gap-3 mt-6 flex-wrap">
          <Link href="/scan" className="bg-accent text-white font-bold rounded-btn px-6 py-3">{t.scan}</Link>
          <Link href="/pro" className="border border-ink rounded-btn px-6 py-3 font-bold">{t.pro}</Link>
        </div>
        <div className="mt-8 rounded-card bg-ink text-white p-5">
          <div className="text-xs uppercase tracking-wide opacity-70">TaskLens · quote</div>
          <div className="font-display text-4xl font-extrabold mt-1">$120 <span className="text-lg opacity-70">– $220</span></div>
          <div className="text-sm mt-1 opacity-80">P-trap · ~1.5h on-site · verified pro · escrow held</div>
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.p1t}</h2>
        <div className="grid gap-3 mt-4">
          {[[t.p1aT, t.p1a], [t.p1bT, t.p1b], [t.p1cT, t.p1c]].map(([h, p]) => (
            <div key={h} className="rounded-card border border-neutral-200 bg-white p-4">
              <div className="font-bold">{h}</div>
              <p className="text-sm text-slate2 mt-1">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.tvsT} <span className="text-xs font-body font-normal text-slate2">({t.tvsNote})</span></h2>
        <div className="rounded-card bg-white border border-neutral-200 p-4 mt-4 space-y-2 text-sm">
          <p>🔻 {t.tvsToday}</p>
          <p>✅ {t.tvsLens}</p>
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.how}</h2>
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          {[["👁", t.s1], ["🎙", t.s2], ["📝", t.s3], ["✓", t.s4]].map(([icon, label]) => (
            <div key={label} className="rounded-card bg-white border border-neutral-200 p-3">
              <div className="text-2xl">{icon}</div>
              <div className="text-xs font-bold mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.prosT}</h2>
        <p className="text-slate2 mt-2">{t.pros}</p>
        <Link href="/login" className="inline-block mt-4 border border-ink rounded-btn px-6 py-3 font-bold">{t.join}</Link>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.trustT}</h2>
        <p className="text-slate2 mt-2">{t.trust}</p>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.catT}</h2>
        <div className="flex flex-wrap gap-2 mt-4">
          {CATS.map((c) => <span key={c} className="chip">{c}</span>)}
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.metaT}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate2">
          {[t.meta1, t.meta2, t.meta3, t.meta4, t.meta5].map((m) => <li key={m}>• {m}</li>)}
        </ul>
      </section>

      <section className="py-8">
        <h2 className="font-display text-2xl font-bold">{t.faqT}</h2>
        <div className="mt-3 space-y-3">
          {[[t.q1, t.a1], [t.q2, t.a2], [t.q3, t.a3], [t.q4, t.a4], [t.q5, t.a5]].map(([q, a]) => (
            <details key={q} className="rounded-card bg-white border border-neutral-200 p-4">
              <summary className="font-bold cursor-pointer">{q}</summary>
              <p className="text-sm text-slate2 mt-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="py-10 text-center">
        <h2 className="font-display text-3xl font-extrabold">{t.ctaT}</h2>
        <div className="flex gap-3 mt-5 justify-center flex-wrap">
          <Link href="/scan" className="bg-accent text-white font-bold rounded-btn px-6 py-3">{t.scan}</Link>
          <Link href="/pro" className="border border-ink rounded-btn px-6 py-3 font-bold">{t.pro}</Link>
        </div>
        <p className="mt-8 text-xs text-slate2">
          <Link href="/privacy" className="underline">{t.privacyLink}</Link> · <Link href="/terms" className="underline">{t.termsLink}</Link> · {t.footer}
        </p>
      </section>
    </main>
  );
}
