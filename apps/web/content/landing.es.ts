/* U5 landing content — typed. ES is primary; EN is a full translation.
   Numbers: only illustrative figures, never invented statistics. */

export interface DemoChapter {
  label: string;
  t: string;
}

export interface DemoVideoConfig {
  provider: "youtube" | "file" | null;
  id?: string;
  src?: string;
  poster: string;
  chapters: DemoChapter[];
}

export interface FeatureChapter {
  slug: string;
  name: string;
  promise: string;
  how: [string, string, string];
  tech: string[];
  who: string[];
}

export interface LandingContent {
  heroKicker: string;
  heroA: string;
  heroB: string;
  sub: string;
  scan: string;
  demo: string;
  lensNote: string;
  p1t: string;
  p1aT: string; p1a: string;
  p1bT: string; p1b: string;
  p1cT: string; p1c: string;
  tvsT: string; tvsNote: string;
  tvsSteps: string[];
  lensSteps: string[];
  how: string;
  steps: { icon: string; label: string; text: string }[];
  featuresT: string;
  featuresSub: string;
  chapters: FeatureChapter[];
  demoT: string;
  demoSoon: string;
  demoSoonBody: string;
  tabsT: string;
  tabs: { id: string; label: string; points: string[] }[];
  citiesT: string;
  citiesSub: string;
  citiesFlow: string[];
  accessCta: string;
  accessTitle: string;
  accessSent: string;
  sendLink: string;
  muniPh: string;
  namePh: string;
  rolePh: string;
  trustT: string;
  trust: { icon: string; title: string; text: string }[];
  metaT: string;
  meta: { title: string; text: string; micro: string }[];
  faqT: string;
  faqs: { q: string; a: string }[];
  ctaT: string;
  prosT: string;
  pros: string;
  join: string;
  demoVideo: DemoVideoConfig;
}

const chaptersEs: FeatureChapter[] = [
  { slug: "escaneo", name: "Escaneo y cotización IA", promise: "Del problema a un precio en segundos.", how: ["Fotografía el daño y descríbelo en voz alta", "Muse Spark arma el alcance, precio y materiales", "Confirma y reserva un profesional verificado"], tech: ["Muse Spark", "Muse Voice Transcribe", "SAM 3.1"], who: ["Clientes"] },
  { slug: "contratos", name: "Contratos inteligentes y firma", promise: "Lo acordado, por escrito y firmado.", how: ["La IA redacta el acuerdo bilingüe del alcance", "Ambas partes firman en su celular", "La garantía solo se autoriza con doble firma"], tech: ["Muse Spark"], who: ["Clientes", "Profesionales"] },
  { slug: "calendario", name: "Calendario inteligente y ruta del día", promise: "El mejor horario, sin llamadas.", how: ["La IA propone 3 horarios según urgencia y ruta", "El profesional escucha su plan del día", "Reprograma con aprobación mutua"], tech: ["Muse Spark"], who: ["Clientes", "Profesionales"] },
  { slug: "pago", name: "Pago protegido", promise: "Retenido en garantía, liberado al verificar.", how: ["Autorizas con PayPal o tarjeta", "El dinero queda congelado, no en manos del pro", "Se libera solo con verificación aprobada"], tech: ["PayPal Orders v2"], who: ["Clientes"] },
  { slug: "verificacion", name: "Verificación antes/después", promise: "La IA comprueba el trabajo terminado.", how: ["El pro sube fotos del después", "Muse Spark compara contra el antes paso a paso", "Pasa y se libera el pago, o se pide corrección"], tech: ["Muse Spark", "SAM 3.1"], who: ["Clientes", "Profesionales"] },
  { slug: "pasaporte", name: "Pasaporte del hogar y garantías", promise: "Cada reparación queda registrada.", how: ["Cada trabajo verificado crea una entrada", "Garantía con cuenta regresiva visible", "Recordatorios de mantenimiento con re-reserva en un toque"], tech: ["Muse Spark"], who: ["Clientes"] },
  { slug: "planificador", name: "Planificador de proyectos", promise: "De un video a fases y cuadrilla.", how: ["Graba un recorrido de 30–60 segundos", "La IA arma fases, presupuesto y materiales", "Reserva un profesional por oficio en secuencia"], tech: ["Muse Spark", "Muse Image"], who: ["Clientes", "Empresas"] },
  { slug: "extranjero", name: "Pago desde el extranjero", promise: "La familia ayuda desde donde esté.", how: ["Crea un enlace de fondeo de un solo uso", "Tu familiar paga la garantía con PayPal o tarjeta", "Mira el avance en vivo y recibe el comprobante"], tech: ["PayPal Orders v2"], who: ["Clientes"] },
  { slug: "mediacion", name: "Mediación justa", promise: "Desacuerdos con propuesta, no con gritos.", how: ["La IA compara contrato, cambios y fotos", "Propone repetir pasos o liberación parcial", "Ambas partes aceptan o escala a un humano"], tech: ["Muse Spark"], who: ["Clientes", "Profesionales"] },
  { slug: "copiloto", name: "Copiloto en lentes", promise: "Un experto manos libres en el trabajo.", how: ["El pro pregunta en voz alta en el sitio", "Muse Spark responde con el alcance y la foto actual", "Vigilancia de riesgos con avisos hablados"], tech: ["Muse Spark", "Muse Voice Transcribe"], who: ["Profesionales"] },
  { slug: "alcaldias", name: "TaskLens para Alcaldías", promise: "Del reporte al despacho con prueba pública.", how: ["Vecinos reportan con foto y ubicación", "La IA clasifica, prioriza y sugiere contratistas", "Cierre con foto verificada y SLA visible"], tech: ["Muse Spark", "SAM 3.1"], who: ["Alcaldías"] },
];

export const demoVideoBase = {
  poster: "/demo-poster.svg",
  chapters: [
    { label: "Escaneo", t: "0:00" },
    { label: "Contrato", t: "0:25" },
    { label: "Trabajo", t: "0:50" },
    { label: "Verificación", t: "1:10" },
  ],
};

export const landingEs: LandingContent = {
  heroKicker: "Para hogares, profesionales y alcaldías de El Salvador",
  heroA: "Tu reparación, cotizada",
  heroB: "en segundos. No en semanas.",
  sub: "Mira el problema con tus lentes Meta o tu celular, descríbelo en voz alta y TaskLens te conecta con un profesional verificado. Tu pago queda protegido hasta que el trabajo esté verificado.",
  scan: "Escanear un problema",
  demo: "Ver demo (2 min)",
  lensNote: "Vista IA: máscara, medidas y anotaciones",
  p1t: "El problema hoy",
  p1aT: "Esperar", p1a: "Las solicitudes pasan por una oficina central o una sola empresa, y la visita tarda días o semanas.",
  p1bT: "Adivinar", p1b: "No sabes cuánto costará hasta que alguien venga a ver.",
  p1cT: "Arriesgar", p1c: "Encontrar mano de obra calificada y confiable depende de recomendaciones, y pagas por adelantado sin garantía.",
  tvsT: "La carrera: hoy vs. TaskLens",
  tvsNote: "Ilustrativo",
  tvsSteps: ["Reportar", "Esperar visita", "Esperar cotización", "Esperar reparación"],
  lensSteps: ["Escanear", "Cotización", "Contrato", "Reservado", "Verificado", "Pago liberado"],
  how: "Cómo funciona",
  steps: [
    { icon: "eye", label: "Mira", text: "Apunta al problema con lentes o celular." },
    { icon: "mic", label: "Habla", text: "Descríbelo en voz alta, en español o inglés." },
    { icon: "sign", label: "Firma", text: "Contrato bilingüe firmado por ambas partes." },
    { icon: "check", label: "Verifica", text: "Fotos antes/después verificadas por IA." },
  ],
  featuresT: "Todo el trabajo, en una app",
  featuresSub: "Desliza por cada capítulo; el teléfono muestra la pantalla real.",
  chapters: chaptersEs,
  demoT: "Míralo en 2 minutos",
  demoSoon: "Demo disponible pronto",
  demoSoonBody: "Estamos grabando el video con trabajos reales. Mientras tanto, prueba un escaneo en vivo.",
  tabsT: "Para cada lado del trabajo",
  tabs: [
    { id: "clientes", label: "Clientes", points: ["Cotización en segundos, sin visitas para saber el precio", "Pago retenido hasta verificación aprobada", "Pasaporte del hogar con garantías y recordatorios", "Pide ayuda a un familiar en el extranjero"] },
    { id: "profesionales", label: "Profesionales", points: ["Trabajos sin intermediarios, alcance claro con fotos", "Ruta del día y calendario inteligente", "Copiloto en lentes que responde en el sitio", "Pago garantizado y reputación que crece"] },
    { id: "empresas", label: "Empresas", points: ["Panel con tu equipo y su disponibilidad", "Despacha trabajos a un miembro en un toque", "Calendario del equipo y trabajos por estado", "Ingresos por trabajo capturado"] },
  ],
  citiesT: "TaskLens para Alcaldías",
  citiesSub: "Los reportes se amontonan en una oficina central. TaskLens le da triage, despacho y prueba pública.",
  citiesFlow: ["Vecino reporta con foto", "IA clasifica y prioriza", "Operador despacha contratista", "Cierre con foto verificada"],
  accessCta: "Solicitar acceso para mi alcaldía",
  accessTitle: "Acceso para alcaldías",
  accessSent: "Solicitud recibida. Te contactaremos.",
  sendLink: "Enviar enlace",
  muniPh: "Municipio",
  namePh: "Nombre",
  rolePh: "Cargo",
  trustT: "Confianza y seguridad",
  trust: [
    { icon: "shield", title: "Pago en garantía", text: "Retenido al reservar, liberado solo con verificación aprobada." },
    { icon: "check", title: "Verificación IA", text: "Fotos antes/después comparadas paso a paso." },
    { icon: "badge", title: "Profesionales verificados", text: "ID revisada a mano; calificaciones de trabajos reales." },
    { icon: "warn", title: "Alertas de seguridad", text: "Gas, electricidad y estructura derivan a profesional licenciado." },
  ],
  metaT: "Hecho con IA de Meta",
  meta: [
    { title: "Muse Spark", text: "Lee fotos y voz, redacta cotizaciones y contratos.", micro: "scan" },
    { title: "Muse Voice Transcribe", text: "Convierte tu voz en texto, en español e inglés.", micro: "wave" },
    { title: "Muse Image", text: "Muestra el después antes de empezar.", micro: "render" },
    { title: "SAM 3.1", text: "Resalta el daño en la foto.", micro: "mask" },
    { title: "Lentes Ray-Ban Meta", text: "Mira el problema y habla manos libres.", micro: "glasses" },
  ],
  faqT: "Preguntas frecuentes",
  faqs: [
    { q: "¿El precio es exacto?", a: "Es un rango conservador calculado por IA; el profesional confirma el alcance antes de firmar el contrato." },
    { q: "¿Y si el trabajo sale mal?", a: "El pago queda retenido hasta que la verificación pase. Puedes pedir corrección o una liberación parcial." },
    { q: "¿Cómo verifican a los profesionales?", a: "ID revisada a mano, trabajos verificados y calificaciones públicas construyen su reputación." },
    { q: "¿Cómo pago?", a: "Con PayPal o tarjeta de débito/crédito. En El Salvador todo es en USD." },
    { q: "¿En qué países operan?", a: "Operamos en El Salvador, con profesionales también en EE. UU. para demos." },
    { q: "¿Necesito lentes Meta?", a: "No. Todo funciona con la cámara de tu celular; los lentes lo hacen manos libres." },
    { q: "¿Y si el daño vuelve?", a: "Dentro del período de garantía, escanea el mismo punto y se abre un reclamo con el profesional original." },
    { q: "¿Mi dirección es pública?", a: "No. Los reportes públicos se recortan a la calle y los enlaces de pago nunca muestran dirección ni teléfono." },
  ],
  ctaT: "Mira el problema. Resuélvelo hoy.",
  prosT: "Para profesionales",
  pros: "Trabajos sin intermediarios, un alcance claro con fotos antes de llegar, pago garantizado por garantía bloqueada y calificaciones que construyen tu reputación.",
  join: "Únete como profesional",
  demoVideo: { provider: null, ...demoVideoBase },
};

import { landingEn } from "./landing.en";

export function landingContent(lang: "es" | "en"): LandingContent {
  const base = lang === "es" ? landingEs : landingEn;
  const override = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;
  if (!override) return base;
  if (override.includes("youtube.com") || override.includes("youtu.be")) {
    const id = override.split(/v=|youtu\.be\//)[1]?.split(/[&#]/)[0];
    if (id) return { ...base, demoVideo: { ...base.demoVideo, provider: "youtube", id } };
  } else {
    return { ...base, demoVideo: { ...base.demoVideo, provider: "file", src: override } };
  }
  return base;
}
