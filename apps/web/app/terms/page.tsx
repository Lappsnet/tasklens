"use client";

import { useEffect, useState } from "react";
import { initialLang } from "@/lib/lang";

const T = {
  es: {
    title: "Términos",
    body: "TaskLens conecta clientes con profesionales independientes. Los precios de la IA son rangos conservadores; el contrato firmado fija el alcance y el precio final. El pago queda retenido en garantía y solo se libera cuando la verificación IA del antes/después es exitosa o el cliente aprueba. Las plantillas de contrato son generadas por IA y no constituyen asesoría legal.",
  },
  en: {
    title: "Terms",
    body: "TaskLens connects customers with independent pros. AI prices are conservative ranges; the signed contract fixes scope and final price. Payment is held in escrow and released only when AI before/after verification passes or the customer approves. Contract templates are AI-generated and not legal advice.",
  },
} as const;

export default function TermsPage() {
  const [lang, setLang] = useState<"en" | "es">("es");
  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);
  const t = T[lang];
  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>
      <p className="mt-3 text-slate2">{t.body}</p>
    </main>
  );
}
