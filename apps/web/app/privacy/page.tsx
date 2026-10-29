"use client";

import { useEffect, useState } from "react";
import { initialLang } from "@/lib/lang";

const T = {
  es: {
    title: "Privacidad",
    body: "TaskLens usa tu cámara, micrófono, ubicación y fotos solo para crear tu cotización, coordinar al profesional y verificar el trabajo. Las fotos se guardan en un almacén privado y se comparten por enlaces temporales. Los pagos los procesa PayPal (modo sandbox hasta verificación del negocio). Puedes pedir la eliminación de tus datos escribiendo a privacy@tasklens.example. Los enlaces de demostración usan datos ficticios.",
  },
  en: {
    title: "Privacy",
    body: "TaskLens uses your camera, microphone, location and photos only to build your quote, coordinate the pro and verify the work. Photos live in private storage served via short-lived links. Payments are processed by PayPal (sandbox until business verification). You can request deletion at privacy@tasklens.example. Demo links use fixture data.",
  },
} as const;

export default function PrivacyPage() {
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
