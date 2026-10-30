"use client";

import { useEffect, useState } from "react";
import { initialLang } from "@/lib/lang";

type Lang = "en" | "es";

const T: Record<Lang, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  es: {
    title: "Términos del servicio",
    updated: "Última actualización: 29 de octubre de 2026.",
    sections: [
      {
        h: "El servicio",
        p: "TaskLens conecta clientes con profesionales independientes para reparaciones y servicios del hogar. TaskLens no ejecuta los trabajos; el contrato de servicio es entre tú y el profesional.",
      },
      {
        h: "Cotizaciones y contratos",
        p: "Los precios de la IA son rangos conservadores, no un precio final. El alcance y el precio final quedan fijados en el contrato de servicio firmado por ambas partes. Las plantillas de contrato son generadas por IA y no constituyen asesoría legal.",
      },
      {
        h: "Pagos y garantía",
        p: "Tu pago queda retenido en garantía (PayPal, USD) al firmar el contrato y solo se libera cuando la verificación de fotos de antes/después es exitosa o tú apruebas el trabajo. Si el trabajo falla la verificación, puedes pedir corrección o abrir una disputa con liberación parcial.",
      },
      {
        h: "Cancelación y disputas",
        p: "Puedes cancelar antes de que el profesional inicie el trabajo; la retención se anula sin costo. Una vez iniciado, los cambios de alcance se cotizan como órdenes de cambio que debes aprobar. Las disputas se resuelven primero con la propuesta de la IA y luego con revisión humana.",
      },
      {
        h: "Responsabilidad",
        p: "Las alertas de seguridad (gas, electricidad, riesgo estructural) son orientativas y siempre derivan a profesionales licenciados. TaskLens no sustituye inspecciones técnicas oficiales.",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: October 29, 2026.",
    sections: [
      {
        h: "The service",
        p: "TaskLens connects customers with independent pros for home repairs and services. TaskLens does not perform the work; the service contract is between you and the pro.",
      },
      {
        h: "Quotes and contracts",
        p: "AI prices are conservative ranges, not a final price. Scope and final price are fixed in the service contract signed by both parties. Contract templates are AI-generated and are not legal advice.",
      },
      {
        h: "Payments and escrow",
        p: "Your payment is held in escrow (PayPal, USD) when the contract is signed and released only when before/after photo verification passes or you approve the work. If verification fails, you can request a fix or open a dispute with partial release.",
      },
      {
        h: "Cancellation and disputes",
        p: "You can cancel before the pro starts work; the hold is voided at no cost. After work starts, scope changes are quoted as change orders you must approve. Disputes go first through the AI proposal, then human review.",
      },
      {
        h: "Liability",
        p: "Safety flags (gas, electricity, structural risk) are advisory and always route to licensed pros. TaskLens does not replace official technical inspections.",
      },
    ],
  },
};

export default function TermsPage() {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);
  const t = T[lang];
  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-xs text-slate2">{t.updated}</p>
      {t.sections.map((s) => (
        <section key={s.h} className="mt-4">
          <h2 className="font-bold">{s.h}</h2>
          <p className="mt-1 text-slate2">{s.p}</p>
        </section>
      ))}
    </main>
  );
}
