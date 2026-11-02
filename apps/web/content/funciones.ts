/* V4 feature-page content. Every slug: ES primary + EN complete.
   Annotated "AI vision" photos come from content/showcase.ts (demo examples,
   labelled as such in the UI). Slugs without a matching photo use the real
   app screenshot (public/images/screens/theater-{slug}.png). */

export interface FuncionesLang {
  problemTitle: string;
  solutionTitle: string;
  stepsTitle: string;
  aiVisionTitle: string;
  aiVisionSub: string;
  techTitle: string;
  faqTitle: string;
  relatedTitle: string;
  demoLabel: string;
}

export const FUNCIONES_T: Record<"es" | "en", FuncionesLang> = {
  es: {
    problemTitle: "El problema",
    solutionTitle: "La solución TaskLens",
    stepsTitle: "Cómo funciona",
    aiVisionTitle: "Qué ve la IA",
    aiVisionSub: "La misma foto que ve el cliente, con el hallazgo marcado.",
    techTitle: "Tecnología Meta",
    faqTitle: "Preguntas",
    relatedTitle: "Sigue explorando",
    demoLabel: "Ejemplos de demostración",
  },
  en: {
    problemTitle: "The problem",
    solutionTitle: "The TaskLens fix",
    stepsTitle: "How it works",
    aiVisionTitle: "What the AI sees",
    aiVisionSub: "The same photo the customer sees, with the finding marked.",
    techTitle: "Built with Meta AI",
    faqTitle: "FAQ",
    relatedTitle: "Keep exploring",
    demoLabel: "Demo examples",
  },
};

export interface FaqQA {
  q: string;
  a: string;
}

export interface SlugContent {
  problem: { es: string; en: string };
  solution: { es: string; en: string };
  href: string;
  cta: { es: string; en: string };
  faqs: { es: FaqQA[]; en: FaqQA[] };
  hero: { type: "screen" } | {
    type: "photo";
    jobId: string;
    annotations: { es: string[]; en: string[] };
    safety?: { es: string; en: string };
  };
}

export const FUNCIONES: Record<string, SlugContent> = {
  escaneo: {
    problem: {
      es: "No sabes cuánto costará hasta que alguien venga a ver.",
      en: "You don't know the price until someone comes to look.",
    },
    solution: {
      es: "Foto + voz → alcance, precio y materiales en segundos.",
      en: "Photo + voice → scope, price and materials in seconds.",
    },
    href: "/scan",
    cta: { es: "Escanear un problema", en: "Scan a problem" },
    faqs: {
      es: [
        { q: "¿Funciona sin lentes Meta?", a: "Sí. La cámara del celular usa el mismo pipeline; los lentes lo hacen manos libres." },
        { q: "¿Qué pasa si la IA no está segura?", a: "Con confianza bajo 0.5 no cotiza: hace preguntas primero." },
        { q: "¿La cotización es el precio final?", a: "No. Es un rango conservador; el profesional confirma el alcance antes de reservar." },
      ],
      en: [
        { q: "Does it work without Meta glasses?", a: "Yes. The phone camera uses the same pipeline; glasses make it hands-free." },
        { q: "What if the AI isn't sure?", a: "Below 0.5 confidence it doesn't quote: it asks questions first." },
        { q: "Is the quote the final price?", a: "No. It's a conservative range; the pro confirms scope before booking." },
      ],
    },
    hero: {
      type: "photo",
      jobId: "bomba-tanque-hidroneumatico",
      annotations: { es: ["Fuga en bomba", "Reportado", "Fontanería"], en: ["Pump leak", "Reported", "Plumbing"] },
    },
  },
  contratos: {
    problem: {
      es: "Lo acordado de palabra se olvida o se discute.",
      en: "Verbal agreements get forgotten or disputed.",
    },
    solution: {
      es: "Contrato bilingüe de cláusulas fijas, firmado por ambas partes.",
      en: "Bilingual fixed-clause contract, signed by both sides.",
    },
    href: "/pro",
    cta: { es: "Soy profesional", en: "I'm a pro" },
    faqs: {
      es: [
        { q: "¿Es asesoría legal?", a: "No. Es una plantilla generada con IA; un abogado debe revisar la biblioteca antes de uso en vivo." },
        { q: "¿Quién puede firmar?", a: "Cliente y profesional, con nombre, firma dibujada y código por correo." },
        { q: "¿Cuándo se autoriza el pago?", a: "Solo cuando ambas partes firman; antes no hay ningún cobro." },
      ],
      en: [
        { q: "Is this legal advice?", a: "No. It's an AI-generated template; a lawyer must review the library before live use." },
        { q: "Who can sign?", a: "Customer and pro, with name, drawn signature and email code." },
        { q: "When is payment authorized?", a: "Only after both sides sign; nothing is charged before." },
      ],
    },
    hero: { type: "screen" },
  },
  calendario: {
    problem: {
      es: "Coordinar horarios por teléfono toma días.",
      en: "Coordinating schedules by phone takes days.",
    },
    solution: {
      es: "La IA propone 3 horarios con urgencia, ruta y disponibilidad.",
      en: "AI proposes 3 slots using urgency, route and availability.",
    },
    href: "/pro/calendar",
    cta: { es: "Ver calendario", en: "View calendar" },
    faqs: {
      es: [
        { q: "¿Cómo elige los horarios?", a: "Cruza urgencia del trabajo, huecos del profesional y tiempo de traslado." },
        { q: "¿Puedo cambiar mi cita?", a: "Sí, con aprobación mutua; si se mueve más de 3 días se re-autoriza el pago." },
        { q: "¿Funciona sin cuenta de Google?", a: "Sí. Cada usuario tiene un feed privado que se suscribe en cualquier calendario." },
      ],
      en: [
        { q: "How are slots chosen?", a: "It crosses job urgency, the pro's openings and travel time." },
        { q: "Can I reschedule?", a: "Yes, with mutual approval; moving more than 3 days re-authorizes payment." },
        { q: "Does it work without a Google account?", a: "Yes. Everyone gets a private feed that subscribes anywhere." },
      ],
    },
    hero: { type: "screen" },
  },
  pago: {
    problem: {
      es: "Pagas por adelantado sin garantía.",
      en: "You pay upfront with no guarantee.",
    },
    solution: {
      es: "Autorización retenida; solo se captura con verificación aprobada.",
      en: "Authorization held; captured only on passing verification.",
    },
    href: "/scan",
    cta: { es: "Escanear un problema", en: "Scan a problem" },
    faqs: {
      es: [
        { q: "¿Cuándo se libera mi dinero?", a: "Solo cuando la verificación marca pass, o cuando tú apruebas la liberación." },
        { q: "¿Y si el trabajo queda mal?", a: "Pide corrección o acepta una liberación parcial; el resto se devuelve." },
        { q: "¿Qué métodos puedo usar?", a: "PayPal, tarjeta de débito o crédito, en USD." },
      ],
      en: [
        { q: "When is my money released?", a: "Only when verification passes, or when you approve the release." },
        { q: "What if the work is bad?", a: "Request a fix or accept a partial release; the rest is returned." },
        { q: "Which methods can I use?", a: "PayPal, debit or credit card, in USD." },
      ],
    },
    hero: { type: "screen" },
  },
  verificacion: {
    problem: {
      es: "Nadie comprueba que el trabajo quedó bien.",
      en: "Nobody checks that the work was done right.",
    },
    solution: {
      es: "Muse Spark compara antes/después paso a paso.",
      en: "Muse Spark compares before/after step by step.",
    },
    href: "/pro",
    cta: { es: "Soy profesional", en: "I'm a pro" },
    faqs: {
      es: [
        { q: "¿Qué compara la IA?", a: "Cada paso del alcance contra las fotos de antes y después, con evidencia visible." },
        { q: "¿Qué pasa si algo falla?", a: "El veredicto es 'revisar': el profesional corrige y reenvía sin costo extra." },
        { q: "¿Quién decide el pago?", a: "Un pass libera el pago; en disputa, la propuesta de mediación la aceptan humanos." },
      ],
      en: [
        { q: "What does the AI compare?", a: "Each scope step against the before and after photos, with visible evidence." },
        { q: "What if something fails?", a: "The verdict is 'review': the pro fixes and resubmits at no extra cost." },
        { q: "Who decides payment?", a: "A pass releases payment; in disputes, humans accept the mediation proposal." },
      ],
    },
    hero: {
      type: "photo",
      jobId: "luminarias-reparadas",
      annotations: { es: ["Mástil reparado", "Verificado ✓", "Alumbrado"], en: ["Pole repaired", "Verified ✓", "Lighting"] },
    },
  },
  pasaporte: {
    problem: {
      es: "Cada reparación se olvida; las garantías se pierden.",
      en: "Every repair is forgotten; warranties get lost.",
    },
    solution: {
      es: "Entrada permanente con fotos, contrato y cuenta regresiva.",
      en: "Permanent entry with photos, contract and countdown.",
    },
    href: "/passport",
    cta: { es: "Ver mi pasaporte", en: "View my passport" },
    faqs: {
      es: [
        { q: "¿Qué guarda el pasaporte?", a: "Fotos de antes/después, contrato firmado, materiales, profesional y vigencia de garantía." },
        { q: "¿Me avisa antes de que venza?", a: "Sí. Recibes recordatorios y puedes reagendar con un toque." },
        { q: "¿Sirve si vendo la casa?", a: "Puedes exportar el pasaporte en PDF para la venta o el alquiler." },
      ],
      en: [
        { q: "What does the passport keep?", a: "Before/after photos, signed contract, materials, pro and warranty window." },
        { q: "Does it warn before expiry?", a: "Yes. You get reminders and can rebook with one tap." },
        { q: "Useful if I sell the home?", a: "You can export the passport as PDF for the sale or rental." },
      ],
    },
    hero: { type: "screen" },
  },
  planificador: {
    problem: {
      es: "Remodelar exige coordinar oficios por meses.",
      en: "Remodeling means coordinating trades for months.",
    },
    solution: {
      es: "Video → fases en orden de oficio → un pro por fase.",
      en: "Video → phases in trade order → one pro per phase.",
    },
    href: "/projects/new",
    cta: { es: "Crear proyecto", en: "Create project" },
    faqs: {
      es: [
        { q: "¿Qué video necesito?", a: "Un recorrido de 30 a 60 segundos del espacio y tu descripción en voz alta." },
        { q: "¿Cómo se contrata la cuadrilla?", a: "Un profesional por oficio, agendados en secuencia según dependencias." },
        { q: "¿Cómo se paga por fases?", a: "Una autorización por fase; cada fase se libera con su propia verificación." },
      ],
      en: [
        { q: "What video do I need?", a: "A 30–60 second walkthrough of the space plus your spoken description." },
        { q: "How is the crew booked?", a: "One pro per trade, scheduled in sequence following dependencies." },
        { q: "How do phase payments work?", a: "One authorization per phase; each releases on its own verification." },
      ],
    },
    hero: { type: "screen" },
  },
  extranjero: {
    problem: {
      es: "Ayudar desde el extranjero es complicado y opaco.",
      en: "Helping from abroad is complicated and opaque.",
    },
    solution: {
      es: "Enlace de fondeo de un solo uso; ves el avance en vivo.",
      en: "Single-use funding link; you watch progress live.",
    },
    href: "/scan",
    cta: { es: "Escanear un problema", en: "Scan a problem" },
    faqs: {
      es: [
        { q: "¿Qué ve quien paga?", a: "Título, precio, resumen del contrato y fotos. Nunca la dirección ni el teléfono." },
        { q: "¿El enlace se puede reutilizar?", a: "No. Es de un solo uso y vence en 72 horas." },
        { q: "¿A quién se devuelve un reembolso?", a: "Siempre a quien pagó la garantía." },
      ],
      en: [
        { q: "What does the payer see?", a: "Title, price, contract summary and photos. Never address or phone." },
        { q: "Can the link be reused?", a: "No. Single-use and expires in 72 hours." },
        { q: "Who gets a refund?", a: "Always whoever funded the escrow." },
      ],
    },
    hero: { type: "screen" },
  },
  mediacion: {
    problem: {
      es: "Los desacuerdos terminan en gritos o tribunales.",
      en: "Disputes end in shouting or courts.",
    },
    solution: {
      es: "La IA compara todo y propone; las personas deciden.",
      en: "AI compares everything and proposes; humans decide.",
    },
    href: "/scan",
    cta: { es: "Escanear un problema", en: "Scan a problem" },
    faqs: {
      es: [
        { q: "¿La IA mueve dinero?", a: "Nunca. Solo propone repetir pasos o una liberación parcial; un humano acepta." },
        { q: "¿Qué pasa si no acepto?", a: "Puedes rechazar y escalar a revisión humana; todo queda registrado." },
        { q: "¿Qué compara la propuesta?", a: "Alcance firmado, órdenes de cambio y verificaciones paso a paso." },
      ],
      en: [
        { q: "Does the AI move money?", a: "Never. It only proposes redo steps or a partial release; a human accepts." },
        { q: "What if I don't accept?", a: "You can reject and escalate to human review; everything is logged." },
        { q: "What does the proposal compare?", a: "Signed scope, change orders and step-by-step verifications." },
      ],
    },
    hero: { type: "screen" },
  },
  copiloto: {
    problem: {
      es: "En el sitio surgen dudas y nadie responde.",
      en: "Questions come up on site and nobody answers.",
    },
    solution: {
      es: "Pregunta en voz alta; el copiloto responde con el alcance.",
      en: "Ask out loud; the copilot answers from the scope.",
    },
    href: "/pro",
    cta: { es: "Soy profesional", en: "I'm a pro" },
    faqs: {
      es: [
        { q: "¿La vigilancia de riesgos certifica seguridad?", a: "No. Es solo un aviso; siempre verifica en el sitio." },
        { q: "¿Guarda mis preguntas?", a: "El intercambio queda en el registro del trabajo para la verificación." },
        { q: "¿Necesito lentes para usarlo?", a: "No. Funciona con el micrófono y la bocina del celular." },
      ],
      en: [
        { q: "Does hazard watch certify safety?", a: "No. It's only a warning; always verify on site." },
        { q: "Does it keep my questions?", a: "The exchange stays in the job log for verification." },
        { q: "Do I need glasses to use it?", a: "No. It works with the phone mic and speaker." },
      ],
    },
    hero: {
      type: "photo",
      jobId: "tablero-electrico-quemado",
      annotations: { es: ["Tablero quemado", "Riesgo eléctrico", "Electricidad"], en: ["Burnt panel", "Electrical hazard", "Electrical"] },
      safety: { es: "⚠ Riesgo eléctrico: corta la energía antes de tocar.", en: "⚠ Electrical hazard: cut power before touching." },
    },
  },
  alcaldias: {
    problem: {
      es: "Los reportes se amontonan en una oficina central.",
      en: "Reports pile up in one central office.",
    },
    solution: {
      es: "Triage IA, despacho y prueba pública con SLA.",
      en: "AI triage, dispatch and public proof with SLA.",
    },
    href: "/city",
    cta: { es: "Ver tablero", en: "View board" },
    faqs: {
      es: [
        { q: "¿Reemplaza a la oficina central?", a: "No. Le da una pantalla de triage y despacho con estado público." },
        { q: "¿Qué datos se publican?", a: "Ubicación redondeada a la calle y fotos del daño. Nunca personas ni placas." },
        { q: "¿Cómo entra mi municipio?", a: "Con una cuenta de operador; cada municipio solo ve sus reportes." },
      ],
      en: [
        { q: "Does it replace the central office?", a: "No. It gives it a triage and dispatch screen with public status." },
        { q: "What data is published?", a: "Street-snapped location and damage photos. Never people or plates." },
        { q: "How does my municipality join?", a: "With an operator account; each municipality sees only its reports." },
      ],
    },
    hero: {
      type: "photo",
      jobId: "calle-con-hundimiento",
      annotations: { es: ["Hundimiento", "Reportado", "Vialidad"], en: ["Sinkhole", "Reported", "Roads"] },
    },
  },
};
