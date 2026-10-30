"use client";

/* U5 landing, rebuilt: dark hero with The Lens, problem cards, scroll race,
   horizontal steps, feature theater, demo block, role tabs, alcaldías,
   trust, Meta AI cards, FAQ, final CTA. ES primary, EN complete. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { MagneticButton } from "@/components/blueprint";
import { landingContent } from "@/content/landing.es";
import type { Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import CitySection from "@/components/landing/CitySection";
import DemoVideo from "@/components/landing/DemoVideo";
import FaqList from "@/components/landing/FaqList";
import HeroLens from "@/components/landing/HeroLens";
import HowSteps from "@/components/landing/HowSteps";
import MetaCards from "@/components/landing/MetaCards";
import ProblemCards from "@/components/landing/ProblemCards";
import RaceSection from "@/components/landing/RaceSection";
import { Reveal, useLenis } from "@/components/landing/motion";
import RoleTabs from "@/components/landing/RoleTabs";
import Theater from "@/components/landing/Theater";
import TrustGrid from "@/components/landing/TrustGrid";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("es");
  useLenis(true);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    setLang(saved === "en" ? "en" : "es");
  }, []);

  const t = landingContent(lang);

  return (
    <main className="font-body text-ink">
      <div className="full-bleed">
        <HeroLens t={t} scanHref="/scan" demoHref="#demo" />
      </div>

      <Reveal className="py-10">
        <h2 className="font-display text-2xl font-bold lg:text-3xl">{t.p1t}</h2>
        <div className="mt-4">
          <ProblemCards
            items={[
              { icon: "wait", title: t.p1aT, text: t.p1a },
              { icon: "guess", title: t.p1bT, text: t.p1b },
              { icon: "risk", title: t.p1cT, text: t.p1c },
            ]}
          />
        </div>
      </Reveal>

      <Reveal className="py-10">
        <RaceSection title={t.tvsT} note={t.tvsNote} today={t.tvsSteps} lens={t.lensSteps} />
      </Reveal>

      <section className="py-10" id="como-funciona" aria-label={t.how}>
        <Reveal>
          <h2 className="font-display text-2xl font-bold lg:text-3xl">{t.how}</h2>
        </Reveal>
        <div className="mt-4">
          <HowSteps steps={t.steps} scanHref="/scan" />
        </div>
      </section>

      <Reveal className="py-10">
        <Theater title={t.featuresT} sub={t.featuresSub} chapters={t.chapters} />
      </Reveal>

      <Reveal className="py-10" >
        <div id="demo">
          <DemoVideo title={t.demoT} soon={t.demoSoon} soonBody={t.demoSoonBody} config={t.demoVideo} />
        </div>
      </Reveal>

      <Reveal className="py-10">
        <RoleTabs title={t.tabsT} tabs={t.tabs} />
      </Reveal>

      <Reveal className="py-10">
        <CitySection
          t={{
            citiesT: t.citiesT,
            citiesSub: t.citiesSub,
            citiesFlow: t.citiesFlow,
            accessCta: t.accessCta,
            accessTitle: t.accessTitle,
            accessSent: t.accessSent,
            muniPh: t.muniPh,
            namePh: t.namePh,
            rolePh: t.rolePh,
            emailLabel: lang === "es" ? "Correo" : "Email",
            sendLink: t.sendLink,
          }}
        />
      </Reveal>

      <Reveal className="py-10" >
        <div id="confianza">
          <TrustGrid title={t.trustT} items={t.trust} />
        </div>
      </Reveal>

      <Reveal className="py-10">
        <div id="funciones">
          <MetaCards title={t.metaT} cards={t.meta} />
        </div>
      </Reveal>

      <Reveal className="py-10">
        <div id="faq">
          <FaqList title={t.faqT} faqs={t.faqs} />
        </div>
      </Reveal>

      <section className="py-10" id="profesionales" aria-label={t.prosT}>
        <Reveal className="rounded-card grad-pan border border-line bg-[linear-gradient(135deg,#16263f,#0f1b2d_45%,#3a1c07)] p-6 text-white shadow-lifted lg:p-10">
          <h2 className="font-display text-2xl font-bold lg:text-3xl">{t.prosT}</h2>
          <p className="mt-2 max-w-[60ch] text-sm text-white/80">{t.pros}</p>
          <MagneticButton className="mt-4 rounded-btn border border-white/40 px-6 py-3 font-bold text-white hover:bg-white/10">
            <Link href="/pro/apply">{t.join}</Link>
          </MagneticButton>
        </Reveal>
      </section>

      <section className="py-12 text-center" aria-label={t.ctaT}>
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold lg:text-5xl">{t.ctaT}</h2>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <MagneticButton className="btn-glow btn-sheen rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
              <Link href="/scan">{t.scan}</Link>
            </MagneticButton>
            <Link href="#demo" className="rounded-btn border border-ink bg-surface px-6 py-3 font-bold">
              {t.demo}
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
