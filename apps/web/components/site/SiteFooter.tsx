"use client";

/* U2 SiteFooter: 4 columns, language + country, Meta-AI line, social placeholders. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe } from "@phosphor-icons/react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

export default function SiteFooter() {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);
  const s = t(lang);

  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: s.footProduct,
      links: [
        { href: "/scan", label: `${s.featScan} · ${s.featQuote}` },
        { href: "/projects/new", label: s.featPlanner },
        { href: "/passport", label: s.featPassport },
        { href: "/city", label: s.featCities },
      ],
    },
    {
      title: s.footWho,
      links: [
        { href: "/scan", label: s.footWhoCustomers },
        { href: "/pro/apply", label: `${s.navPros} · ${s.navCompanies}` },
        { href: "/city", label: s.navCities },
      ],
    },
    {
      title: s.footResources,
      links: [
        { href: "/#como-funciona", label: s.navHow },
        { href: "/#faq", label: s.navFaq },
        { href: "/#confianza", label: s.trustTitle },
      ],
    },
    {
      title: s.footLegal,
      links: [
        { href: "/privacy", label: lang === "es" ? "Privacidad" : "Privacy" },
        { href: "/terms", label: lang === "es" ? "Términos" : "Terms" },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-ink hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-muted">
          <span className="font-display font-bold text-ink">TaskLens · 2026</span>
          <span>{s.footMadeWith}</span>
          <span className="inline-flex items-center gap-1.5">
            <Globe size={16} aria-hidden="true" />
            {s.footCountry} · {lang.toUpperCase()}
          </span>
        </div>
      </div>
    </footer>
  );
}
