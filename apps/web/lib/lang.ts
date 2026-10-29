"use client";

/** P0-3: Spanish defaults from Accept-Language (middleware cookie), EN/ES toggle wins after. */
export function initialLang(): "en" | "es" | null {
  try {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") return saved;
    const m = document.cookie.match(/(?:^|; )tasklens:lang=(en|es)/);
    if (m) return m[1] as "en" | "es";
  } catch {
    /* ignore */
  }
  return null;
}
