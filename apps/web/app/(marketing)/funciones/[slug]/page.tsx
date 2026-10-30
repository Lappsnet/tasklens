import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/landing/motion";
import FaqList from "@/components/landing/FaqList";
import { landingEn } from "@/content/landing.en";
import { landingContent } from "@/content/landing.es";
import FeatureVisual from "../FeatureVisual";

/* U6 feature deep pages: hero, problem -> solution, steps, Meta tech, FAQs, CTA.
   Statically generated for every chapter; linked from the mega-menu + theater. */

const PROBLEMS: Record<string, { problem: string; solution: string }> = {
  escaneo: { problem: "No sabes cuánto costará hasta que alguien venga a ver.", solution: "Foto + voz → alcance, precio y materiales en segundos." },
  contratos: { problem: "Lo acordado de palabra se olvida o se discute.", solution: "Contrato bilingüe de cláusulas fijas, firmado por ambas partes." },
  calendario: { problem: "Coordinar horarios por teléfono toma días.", solution: "La IA propone 3 horarios con urgencia, ruta y disponibilidad." },
  pago: { problem: "Pagas por adelantado sin garantía.", solution: "Autorización retenida; solo se captura con verificación aprobada." },
  verificacion: { problem: "Nadie comprueba que el trabajo quedó bien.", solution: "Muse Spark compara antes/después paso a paso." },
  pasaporte: { problem: "Cada reparación se olvida; las garantías se pierden.", solution: "Entrada permanente con fotos, contrato y cuenta regresiva." },
  planificador: { problem: "Remodelar exige coordinar oficios por meses.", solution: "Video → fases en orden de oficio → un pro por fase." },
  extranjero: { problem: "Ayudar desde el extranjero es complicado y opaco.", solution: "Enlace de fondeo de un solo uso; ves el avance en vivo." },
  mediacion: { problem: "Los desacuerdos terminan en gritos o tribunales.", solution: "La IA compara todo y propone; las personas deciden." },
  copiloto: { problem: "En el sitio surgen dudas y nadie responde.", solution: "Pregunta en voz alta; el copiloto responde con el alcance." },
  alcaldias: { problem: "Los reportes se amontonan en una oficina central.", solution: "Triage IA, despacho y prueba pública con SLA." },
};

const CTA: Record<string, { href: string; label: string }> = {
  escaneo: { href: "/scan", label: "Escanear un problema" },
  contratos: { href: "/pro", label: "Soy profesional" },
  calendario: { href: "/pro/calendar", label: "Ver calendario" },
  pago: { href: "/scan", label: "Escanear un problema" },
  verificacion: { href: "/pro", label: "Soy profesional" },
  pasaporte: { href: "/passport", label: "Ver mi pasaporte" },
  planificador: { href: "/projects/new", label: "Crear proyecto" },
  extranjero: { href: "/scan", label: "Escanear un problema" },
  mediacion: { href: "/scan", label: "Escanear un problema" },
  copiloto: { href: "/pro", label: "Soy profesional" },
  alcaldias: { href: "/city", label: "Ver tablero" },
};

const FAQS: Record<string, { q: string; a: string }[]> = {
  escaneo: [
    { q: "¿Funciona sin lentes Meta?", a: "Sí. La cámara del celular usa el mismo pipeline; los lentes lo hacen manos libres." },
    { q: "¿Qué pasa si la IA no está segura?", a: "Con confianza bajo 0.5 no cotiza: hace preguntas primero." },
  ],
  pago: [
    { q: "¿Cuándo se libera mi dinero?", a: "Solo cuando la verificación marca pass, o cuando tú apruebas la liberación." },
    { q: "¿Y si el trabajo queda mal?", a: "Pide corrección o acepta una liberación parcial; el resto se devuelve." },
  ],
  contratos: [
    { q: "¿Es asesoría legal?", a: "No. Es una plantilla generada con IA; un abogado debe revisar la biblioteca antes de uso en vivo." },
    { q: "¿Quién puede firmar?", a: "Cliente y profesional, con nombre, firma dibujada y código por correo." },
  ],
  copiloto: [
    { q: "¿La vigilancia de riesgos certifica seguridad?", a: "No. Es solo un aviso; siempre verifica en el sitio." },
    { q: "¿Guarda mis preguntas?", a: "El intercambio queda en el registro del trabajo para la verificación." },
  ],
};

export async function generateStaticParams() {
  return landingEn.chapters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = landingContent("es").chapters.find((x) => x.slug === slug);
  return { title: c ? `TaskLens — ${c.name}` : "TaskLens — Función" };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapters = landingContent("es").chapters;
  const chapter = chapters.find((c) => c.slug === slug);
  if (!chapter) notFound();
  const c = chapter;
  const ps = PROBLEMS[slug] ?? { problem: "", solution: "" };
  const faqs = FAQS[slug] ?? landingContent("es").faqs.slice(0, 2);
  const cta = CTA[slug] ?? { href: "/scan", label: "Escanear un problema" };

  return (
    <main className="font-body text-ink">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        <Link href="/#funciones" className="underline">Funciones</Link> / {c.slug}
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight">{c.name}</h1>
      <p className="mt-2 font-display text-xl text-muted">{c.promise}</p>

      <div className="mt-5">
        <Reveal>
          <FeatureVisual slug={slug} />
        </Reveal>
      </div>

      <section className="mt-8 grid gap-3 md:grid-cols-2" aria-label="problema y solución">
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="font-bold text-[#B42318]">El problema</h2>
          <p className="mt-1 text-sm text-muted">{ps.problem}</p>
        </div>
        <div className="rounded-card border border-verified bg-surface p-4">
          <h2 className="font-bold text-verified">La solución TaskLens</h2>
          <p className="mt-1 text-sm text-muted">{ps.solution}</p>
        </div>
      </section>

      <section className="mt-8" aria-label="paso a paso">
        <h2 className="font-display text-2xl font-bold">Paso a paso</h2>
        <ol className="mt-3 space-y-2">
          {c.how.map((h, i) => (
            <li key={h} className="flex gap-3 rounded-card border border-line bg-surface p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-bg">{i + 1}</span>
              <span className="text-sm">{h}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-label="tecnología meta">
        <h2 className="font-display text-2xl font-bold">Tecnología Meta</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.tech.map((t) => (
            <span key={t} className="rounded-full bg-blueprint/10 px-3 py-1 font-mono text-xs font-semibold text-blueprint">{t}</span>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <FaqList title="Preguntas" faqs={faqs} />
      </div>

      <div className="mt-8 rounded-card grad-pan bg-[linear-gradient(135deg,#16263f,#0f1b2d_45%,#3a1c07)] p-6 text-center text-white">
        <p className="font-display text-2xl font-extrabold">Mira el problema. Resuélvelo hoy.</p>
        <Link href={cta.href} className="btn-glow btn-sheen mt-4 inline-block rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
          {cta.label}
        </Link>
      </div>
    </main>
  );
}
