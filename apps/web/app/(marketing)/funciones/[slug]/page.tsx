import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/landing/motion";
import FaqList from "@/components/landing/FaqList";
import AnnotatedPhoto from "@/components/landing/AnnotatedPhoto";
import Container from "@/components/site/Container";
import { landingContent } from "@/content/landing.es";
import { SHOWCASE_JOBS } from "@/content/showcase";
import { FUNCIONES, FUNCIONES_T } from "@/content/funciones";

/* V4 feature deep pages: hero (real photo or app screenshot, headline, lead,
   CTA) → El problema → Cómo funciona (3 steps) → Qué ve la IA (annotated
   showcase photo, labelled demo) → Meta tech → FAQ (3) → related → dark CTA.
   Same type scale and bands as the landing. ES primary, EN complete. */

export async function generateStaticParams() {
  return Object.keys(FUNCIONES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = landingContent("es").chapters.find((x) => x.slug === slug);
  return { title: c ? `TaskLens — ${c.name}` : "TaskLens — Función" };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookie = (await cookies()).get("tasklens:lang")?.value;
  const lang = cookie === "en" ? "en" : "es";
  const t = FUNCIONES_T[lang];
  const chapters = landingContent(lang).chapters;
  const chapter = chapters.find((c) => c.slug === slug);
  if (!chapter) notFound();
  const f = FUNCIONES[slug];
  if (!f) notFound();
  const faqs = f.faqs[lang].map((x) => ({ q: x.q, a: x.a }));
  const heroJobId = f.hero.type === "photo" ? f.hero.jobId : null;
  const seen = heroJobId ? (SHOWCASE_JOBS.find((j) => j.id === heroJobId) ?? SHOWCASE_JOBS[0]) : null;
  const related = chapters.filter((c) => c.slug !== slug).slice(0, 3);
  const backLabel = lang === "es" ? "Funciones" : "Features";
  const finalCta = lang === "es" ? "Mira el problema. Resuélvelo hoy." : "Look at the problem. Fix it today.";

  return (
    <main className="font-body text-ink">
      {/* Hero: real app screenshot or annotated photo + headline + lead + CTA */}
      <section className="bg-[#0A1220] text-white">
        <Container>
          <div className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-16">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-white/60">
                <Link href="/#funciones" className="underline">{backLabel}</Link> / {chapter.slug}
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.02] tracking-tight lg:text-6xl">{chapter.name}</h1>
              <p className="mt-4 max-w-[42ch] text-lg leading-relaxed text-white/75">{chapter.promise}</p>
              <Link href={f.href} className="mt-6 inline-block rounded-btn bg-[var(--signal)] px-6 py-3 font-bold text-[var(--signal-ink)]">
                {f.cta[lang]}
              </Link>
            </div>
            <div className="overflow-hidden rounded-card border border-white/15 bg-surface">
              {seen ? (
                <AnnotatedPhoto
                  job={seen}
                  annotations={f.hero.type === "photo" ? f.hero.annotations[lang] : []}
                  safety={f.hero.type === "photo" ? f.hero.safety?.[lang] : undefined}
                  demoLabel={t.demoLabel}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/images/screens/theater-${chapter.slug}.png`}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover object-top"
                />
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* El problema → solución */}
      <section className="bg-white" aria-label={t.problemTitle}>
        <Container>
          <Reveal className="grid gap-4 py-16 sm:py-20 md:grid-cols-2 lg:py-24">
            <div className="rounded-card border border-line bg-bg p-6">
              <h2 className="font-display text-xl font-bold text-[#B42318]">{t.problemTitle}</h2>
              <p className="mt-2 text-lg leading-relaxed text-muted">{f.problem[lang]}</p>
            </div>
            <div className="rounded-card border border-[var(--verified)] bg-bg p-6">
              <h2 className="font-display text-xl font-bold text-[var(--verified)]">{t.solutionTitle}</h2>
              <p className="mt-2 text-lg leading-relaxed text-muted">{f.solution[lang]}</p>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Cómo funciona: 3 steps */}
      <section className="bg-bg" aria-label={t.stepsTitle}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <h2 className="font-display text-3xl font-bold lg:text-[40px]">{t.stepsTitle}</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {chapter.how.map((h, i) => (
                <li key={h} className="rounded-card border border-line bg-surface p-5 shadow-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-mono text-sm font-bold text-bg">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 text-[15px] leading-relaxed">{h}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Qué ve la IA */}
      {seen && f.hero.type === "photo" && (
        <section className="bg-white" aria-label={t.aiVisionTitle}>
          <Container>
            <Reveal className="grid items-center gap-8 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
              <AnnotatedPhoto
                job={seen}
                annotations={f.hero.annotations[lang]}
                safety={f.hero.safety?.[lang]}
                demoLabel={t.demoLabel}
              />
              <div>
                <h2 className="font-display text-3xl font-bold lg:text-[40px]">{t.aiVisionTitle}</h2>
                <p className="mt-3 max-w-[46ch] text-lg leading-relaxed text-muted">{t.aiVisionSub}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {chapter.tech.map((tech) => (
                    <span key={tech} className="rounded-full bg-blueprint/10 px-3 py-1 font-mono text-xs font-semibold text-blueprint">{tech}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          </Container>
        </section>
      )}

      {/* Meta tech */}
      <section className="bg-bg" aria-label={t.techTitle}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <h2 className="font-display text-3xl font-bold lg:text-[40px]">{t.techTitle}</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {chapter.tech.map((tech) => (
                <span key={tech} className="rounded-full bg-blueprint/10 px-4 py-1.5 font-mono text-sm font-semibold text-blueprint">{tech}</span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-white" aria-label={t.faqTitle}>
        <Container>
          <Reveal className="py-16 sm:py-20 lg:py-24">
            <FaqList title={t.faqTitle} faqs={faqs} />
          </Reveal>
        </Container>
      </section>

      {/* Related */}
      <section className="bg-bg" aria-label={t.relatedTitle}>
        <Container>
          <div className="py-16 sm:py-20 lg:py-24">
            <h2 className="font-display text-3xl font-bold lg:text-[40px]">{t.relatedTitle}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/funciones/${r.slug}`} className="rounded-card border border-line bg-surface p-5 shadow-soft transition hover:shadow-lifted">
                  <p className="font-display text-xl font-bold">{r.name} →</p>
                  <p className="mt-1 text-sm text-muted">{r.promise}</p>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0A1220] text-white" aria-label="cta">
        <Container>
          <Reveal className="py-16 text-center sm:py-20 lg:py-24">
            <p className="mx-auto max-w-[20ch] font-display text-4xl font-extrabold leading-tight lg:text-5xl">{finalCta}</p>
            <Link href={f.href} className="mt-6 inline-block rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
              {f.cta[lang]}
            </Link>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
