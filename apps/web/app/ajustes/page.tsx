"use client";

/* U4 Ajustes: language, theme, account, sign out. */

import { useEffect, useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { browserAuth, demoLogout, hasSupabaseBrowser } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { roleLabel } from "@/components/site/nav";

export default function AjustesPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [role, setRole] = useState<string>("");
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) setRole(((await res.json()) as { role?: string }).role ?? "");
      } catch {
        /* signed out */
      }
    })();
  }, []);

  function pickLang(l: Lang) {
    setLang(l);
    try {
      window.localStorage.setItem("tasklens:lang", l);
      document.cookie = `tasklens:lang=${l}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
  }

  async function signOut() {
    try {
      await demoLogout();
      if (hasSupabaseBrowser()) await browserAuth().auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold">{strings.ajustesTitle}</h1>
      <Card>
        <h2 className="mb-2 font-bold">{strings.settingsLang}</h2>
        <div className="seg" role="group" aria-label={strings.settingsLang}>
          {(["es", "en"] as Lang[]).map((l) => (
            <button key={l} type="button" className={lang === l ? "on" : ""} onClick={() => pickLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">{strings.settingsTheme}</h2>
        <ThemeToggle />
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">{strings.settingsAccount}</h2>
        {role ? (
          <div className="flex items-center gap-2">
            <Avatar name={roleLabel(role, lang)} size={36} />
            <Badge status={role} />
          </div>
        ) : (
          <p className="text-sm text-muted">{strings.loginTitle}</p>
        )}
        <Button variant="ghost" onPress={signOut} className="mt-3">
          <SignOut size={18} aria-hidden="true" /> {strings.settingsSignOut}
        </Button>
      </Card>
    </div>
  );
}
