"use client";

import { useEffect, useState } from "react";
import { initialLang } from "@/lib/lang";

type Lang = "en" | "es";

const T: Record<Lang, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  es: {
    title: "Política de privacidad",
    updated: "Última actualización: 29 de octubre de 2026.",
    sections: [
      {
        h: "Qué datos usamos",
        p: "TaskLens usa la cámara (fotos del problema y del trabajo), el micrófono (notas de voz y comandos), tu ubicación aproximada (para encontrar profesionales cercanos) y las fotos que subes. Solo se recogen cuando tú inicias una acción: escanear, grabar una nota o buscar profesionales.",
      },
      {
        h: "Para qué los usamos",
        p: "Crear tu cotización con IA, coordinar al profesional asignado y verificar el trabajo con fotos de antes/después. No vendemos tus datos ni los usamos para publicidad.",
      },
      {
        h: "Fotos y almacenamiento",
        p: "Las fotos se guardan en un almacén privado y se comparten solo mediante enlaces temporales de corta duración con el profesional asignado y, si abres una disputa, con el equipo de revisión.",
      },
      {
        h: "Pagos (PayPal)",
        p: "Los pagos los procesa PayPal con tarjeta o saldo. TaskLens nunca ve ni guarda tu número de tarjeta. Mientras la cuenta de negocio no esté verificada operamos en modo sandbox (prueba) y ningún cargo es real.",
      },
      {
        h: "Conservación",
        p: "Conservamos tus trabajos, contratos firmados y fotos mientras tu cuenta exista para garantizar contratos y reclamos. Puedes pedir la eliminación total escribiendo a privacy@tasklens.example; la completamos en un máximo de 30 días salvo obligaciones legales.",
      },
      {
        h: "Cuentas demo",
        p: "Los enlaces de demostración usan datos ficticios y no recogen información real.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: October 29, 2026.",
    sections: [
      {
        h: "What data we use",
        p: "TaskLens uses the camera (photos of the problem and the work), the microphone (voice notes and commands), your approximate location (to find nearby pros) and the photos you upload. Data is only collected when you start an action: scanning, recording a note, or searching for pros.",
      },
      {
        h: "Why we use it",
        p: "To build your AI quote, coordinate the assigned pro, and verify the work with before/after photos. We never sell your data or use it for advertising.",
      },
      {
        h: "Photos and storage",
        p: "Photos live in private storage and are shared only through short-lived links with the assigned pro and, if you open a dispute, with the review team.",
      },
      {
        h: "Payments (PayPal)",
        p: "Payments are processed by PayPal with card or balance. TaskLens never sees or stores your card number. Until the business account is verified we run in sandbox mode and no charge is real.",
      },
      {
        h: "Retention",
        p: "We keep your jobs, signed contracts and photos while your account exists to back warranties and claims. You can request full deletion at privacy@tasklens.example; we complete it within 30 days except where the law requires otherwise.",
      },
      {
        h: "Demo accounts",
        p: "Demo links use fixture data and collect no real information.",
      },
    ],
  },
};

export default function PrivacyPage() {
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
