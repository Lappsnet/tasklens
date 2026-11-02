/* U5 landing, rebuilt: dark hero with The Lens, problem cards, scroll race,
   horizontal steps, feature theater, demo block, role tabs, alcaldías,
   trust, Meta AI cards, FAQ, final CTA. ES primary, EN complete.
   Server Component (F1.5): language comes from the tasklens:lang cookie so
   there is no ES-first flash; interactive sections are client islands. */

import Link from "next/link";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { MagneticButton } from "@/components/blueprint";
import Container from "@/components/site/Container";
import { landingContent } from "@/content/landing.es";
import CitySection from "@/components/landing/CitySection";
import DemoVideo from "@/components/landing/DemoVideo";
import FaqList from "@/components/landing/FaqList";
import HeroLens from "@/components/landing/HeroLens";
import MetaCards from "@/components/landing/MetaCards";
import ProblemCards from "@/components/landing/ProblemCards";
import { Reveal } from "@/components/landing/motion";
import RoleTabs from "@/components/landing/RoleTabs";
import LiveJobs from "@/components/landing/LiveJobs";

// F2.4: below-fold GSAP sections ship as separate chunks so the heavy
// animation code never blocks the initial render. HeroLens stays direct (LCP).
const HowSteps = dynamic(() => import("@/components/landing/HowSteps"));
const RaceSection = dynamic(() => import("@/components/landing/RaceSection"));
const Theater = dynamic(() => import("@/components/landing/Theater"));
const TrustGrid = dynamic(() => import("@/components/landing/TrustGrid"));

export default async function LandingPage() {
  const cookie = (await cookies()).get("tasklens:lang")?.value;
  const lang = cookie === "en" ? "en" : "es";

  const t = landingContent(lang);

  return (
    <main className="bg-bg font-body text-ink">
      <HeroLens t={t} scanHref="/scan" demoHref="#demo" />

      <section className="bg-bg" id="trabajos" aria-label={lang === "es" ? "Trabajos en vivo" : "Live jobs"}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <LiveJobs lang={lang} />
          </div>
        </Container>
      </section>

      <section className="bg-white" aria-label={t.p1t}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">{t.p1t}</p>
            <h2 className="mt-3 max-w-[22ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight lg:text-[40px]">{t.p1aT} / {t.p1bT} / {t.p1cT}</h2>
            <div className="mt-8">
              <ProblemCards
                items={[
                  { icon: "wait", title: t.p1aT, text: t.p1a },
                  { icon: "guess", title: t.p1bT, text: t.p1b },
                  { icon: "risk", title: t.p1cT, text: t.p1c },
                ]}
              />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-[#0A1220] text-white" aria-label={t.tvsT}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <RaceSection title={t.tvsT} note={t.tvsNote} today={t.tvsSteps} lens={t.lensSteps} todayLabel={t.raceToday} dayLabel={t.raceDay} lensLabel={t.raceLens} sealLabel={t.raceSeal} todayAxis={t.todayAxis} lensAxis={t.lensAxis} dark />
          </div>
        </Container>
      </section>

      <section className="bg-bg" id="como-funciona" aria-label={t.how}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <Reveal>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">{t.how}</p>
              <h2 className="mt-3 max-w-[24ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight lg:text-[40px]">
                {t.steps.map((s) => s.label).join(" · ")}
              </h2>
            </Reveal>
            <div className="mt-8">
              <HowSteps steps={t.steps} scanHref="/scan" tryNow={t.tryNow} />
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white" aria-label={t.featuresT}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <Theater title={t.featuresT} sub={t.featuresSub} chapters={t.chapters} />
          </div>
        </Container>
      </section>

      <section className="bg-[#0A1220]" id="demo" aria-label={t.demoT}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24" >
            <div>
              <DemoVideo title={t.demoT} soon={t.demoSoon} soonBody={t.demoSoonBody} config={t.demoVideo} dark />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-bg" aria-label={t.tabsT}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24">
            <RoleTabs title={t.tabsT} tabs={t.tabs} />
          </Reveal>
        </Container>
      </section>

      <section className="bg-bg" aria-label={t.citiesT}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24">
            <CitySection
              lang={lang}
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
        </Container>
      </section>

      <section className="bg-white" id="confianza" aria-label={t.trustT}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24" >
            <div>
              <TrustGrid title={t.trustT} items={t.trust} escrowTitle={t.escrowTitle} escrowSteps={t.escrowSteps} />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-bg" id="funciones" aria-label={t.metaT}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24">
            <div>
              <MetaCards title={t.metaT} cards={t.meta} voiceSample={t.voiceSample} />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-white" id="faq" aria-label={t.faqT}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24">
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
              <div>
                <h2 className="font-display text-3xl font-bold lg:text-[40px] lg:leading-[1.05]">{t.faqT}</h2>
              </div>
              <FaqList title="" faqs={t.faqs} />
            </div>
          </Reveal>
        </Container>
      </section>

      <Container>
        <section className="py-10" id="profesionales" aria-label={t.prosT}>
          <Reveal className="rounded-card grad-pan border border-line bg-[linear-gradient(135deg,#16263f,#0f1b2d_45%,#3a1c07)] p-6 text-white shadow-lifted lg:p-10">
            <h2 className="font-display text-3xl font-bold lg:text-[40px]">{t.prosT}</h2>
            <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-white/80">{t.pros}</p>
            <MagneticButton className="mt-6 rounded-btn border border-white/40 px-6 py-3 font-bold text-white hover:bg-white/10">
              <Link href="/pro/apply">{t.join}</Link>
            </MagneticButton>
          </Reveal>
        </section>
      </Container>

      <section className="bg-[#0A1220] text-white" aria-label={t.ctaT}>
        <Container>
          <div className="py-16 text-center sm:py-20 lg:py-24">
            <Reveal>
              <h2 className="mx-auto max-w-[20ch] font-display text-4xl font-extrabold leading-[1.02] tracking-tight lg:text-6xl">{t.ctaT}</h2>
              <div className="mt-8 flex justify-center gap-3 flex-wrap">
                <MagneticButton className="fx-glow fx-sheen rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
                  <Link href="/scan">{t.scan}</Link>
                </MagneticButton>
                <Link href="#demo" className="rounded-btn border border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10">
                  {t.demo}
                </Link>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </main>
  );
}
