"use client";

/* U2 SiteHeader: sticky, transparent over the hero, condenses on scroll
   (Motion scroll-linked). Desktop nav + mega-menu, mobile full-screen sheet,
   signed-in bell + user menu. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Bell, List, Play, X } from "@phosphor-icons/react";
import { Avatar, Badge, Button, Dialog, DialogTrigger, IconButton, Menu } from "@/components/ui";
import { MagneticButton } from "@/components/blueprint";
import { ThemeToggle } from "@/components/theme";
import { browserAuth, demoLogout, hasSupabaseBrowser } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { featureLinks, roleHome, roleLabel, roleLinks } from "./nav";

interface Me {
  role: string;
  demo: boolean;
  city?: string | null;
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="TaskLens">
      <span className="relative inline-block h-7 w-7" aria-hidden="true">
        <span className="absolute left-0 top-0 h-3 w-3 border-l-[3px] border-t-[3px] border-signal rounded-tl transition-transform duration-200 group-hover:scale-110" />
        <span className="absolute right-0 top-0 h-3 w-3 border-r-[3px] border-t-[3px] border-signal rounded-tr transition-transform duration-200 group-hover:scale-110" />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b-[3px] border-l-[3px] border-signal rounded-bl transition-transform duration-200 group-hover:scale-110" />
        <span className="absolute bottom-0 right-0 h-3 w-3 border-b-[3px] border-r-[3px] border-signal rounded-br transition-transform duration-200 group-hover:scale-110" />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">TaskLens</span>
    </Link>
  );
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="seg" role="group" aria-label="language">
      {(["es", "en"] as Lang[]).map((l) => (
        <button key={l} type="button" className={lang === l ? "on" : ""} onClick={() => onChange(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function SiteHeader() {
  const [lang, setLang] = useState<Lang>("es");
  const [scrolled, setScrolled] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const { scrollY } = useScroll();
  const strings = t(lang);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) setMe((await res.json()) as Me);
      } catch {
        /* signed out */
      }
    })();
  }, []);

  function pickLang(l: Lang) {
    setLang(l);
    try {
      window.localStorage.setItem("tasklens:lang", l);
      document.cookie = `tasklens:lang=${l}; path=/; max-age=3153600`;
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

  const feats = featureLinks(lang);
  const dashHref = me ? roleHome(me.role) : "/";

  return (
    <motion.header
      className={`sticky top-0 z-50 transition-colors duration-200 ${scrolled ? "border-b border-line bg-surface/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"}`}
      animate={{ height: scrolled ? 60 : 76 }}
      style={{ height: 76 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-3 px-4">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="primary">
          <Link href="/#como-funciona" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint">{strings.navHow}</Link>
          <DialogTrigger>
            <button type="button" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint" aria-haspopup="dialog">
              {strings.navFeatures}
            </button>
            <Dialog title={strings.navFeatures}>
              <div className="grid gap-1 sm:grid-cols-2">
                {feats.map((f) => (
                  <Link
                    key={f.slug}
                    href={f.href}
                    className="flex items-start gap-3 rounded-btn p-2.5 outline-none hover-tint focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    <f.icon size={22} weight="duotone" className="mt-0.5 shrink-0 text-blueprint" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-bold">{f.name}</span>
                      <span className="block text-xs text-muted">{f.desc}</span>
                    </span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="flex items-center gap-3 rounded-card border border-dashed border-line p-2.5 text-left sm:col-span-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal text-[var(--signal-ink)]">
                    <Play size={16} weight="fill" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">Mira el demo (2 min)</span>
                    <span className="block text-xs text-muted">Video · {strings.demoSoon}</span>
                  </span>
                </button>
              </div>
            </Dialog>
          </DialogTrigger>
          <Link href="/#profesionales" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint">{strings.navPros}</Link>
          <Link href="/pro/apply" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint">{strings.navCompanies}</Link>
          <Link href="/city" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint">{strings.navCities}</Link>
          <Link href="/#faq" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint">{strings.navFaq}</Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LangToggle lang={lang} onChange={pickLang} />
          <ThemeToggle />
          {!me ? (
            <>
              <Link href="/login" className="rounded-btn px-3 py-2 text-sm font-semibold hover-tint">{strings.signIn}</Link>
              <MagneticButton className="rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-125">
                <Link href="/login">{strings.signUp}</Link>
              </MagneticButton>
            </>
          ) : (
            <>
              <Menu
                label={<Bell size={20} aria-label={strings.notifications} />}
                items={roleLinks(me.role, lang).map((l) => ({ id: l.href, label: l.label }))}
                onAction={(href) => { window.location.href = href; }}
              />
              <Menu
                label={
                  <span className="flex items-center gap-2">
                    <Avatar name={roleLabel(me.role, lang)} size={30} />
                    <Badge status={me.role} />
                  </span>
                }
                items={[
                  ...roleLinks(me.role, lang).map((l) => ({ id: `go:${l.href}`, label: l.label })),
                  ...(me.role === "pro" || me.role === "company"
                    ? [{ id: "go:/pro", label: strings.connectGlasses }]
                    : []),
                  { id: "signout", label: strings.signOut, danger: true },
                ]}
                onAction={(id) => {
                  if (id === "signout") signOut();
                  else if (id.startsWith("go:")) window.location.href = id.slice(3);
                }}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {!me ? (
            <Link href="/login" className="rounded-btn bg-ink px-4 py-2 text-sm font-semibold text-bg">{strings.signIn}</Link>
          ) : (
            <Link href={dashHref} aria-label={strings.userMenu}>
              <Avatar name={roleLabel(me.role, lang)} size={32} />
            </Link>
          )}
          <IconButton label={strings.menu} onPress={() => setMobileOpen(true)}>
            <List size={22} />
          </IconButton>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label={strings.menu}
          >
            <div className="flex h-[76px] items-center justify-between px-4">
              <Logo />
              <IconButton label={strings.close} onPress={() => setMobileOpen(false)}>
                <X size={22} />
              </IconButton>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-auto px-4" aria-label="mobile">
              {[
                { href: "/#como-funciona", label: strings.navHow },
                { href: "/#profesionales", label: strings.navPros },
                { href: "/pro/apply", label: strings.navCompanies },
                { href: "/city", label: strings.navCities },
                { href: "/#faq", label: strings.navFaq },
              ].map((l, i) => (
                <motion.div
                  key={l.href + l.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-btn py-3 font-display text-2xl font-extrabold"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="border-t border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <LangToggle lang={lang} onChange={pickLang} />
                <ThemeToggle />
              </div>
              {!me ? (
                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-btn border border-ink px-4 py-3 text-center text-sm font-bold">
                    {strings.signIn}
                  </Link>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-btn bg-ink px-4 py-3 text-center text-sm font-bold text-bg">
                    {strings.signUp}
                  </Link>
                </div>
              ) : (
                <Button onPress={signOut}>
                  {strings.signOut} · {roleLabel(me.role, lang)}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DialogTrigger isOpen={demoOpen} onOpenChange={setDemoOpen}>
        <span className="hidden" aria-hidden="true" />
        <Dialog title={strings.demoSoon}>
          <p className="text-sm text-muted">{strings.demoSoonBody}</p>
          <div className="mt-4">
            <Link href="/scan" className="rounded-btn bg-signal px-4 py-2.5 text-sm font-bold text-white">
              {strings.tryScan}
            </Link>
          </div>
        </Dialog>
      </DialogTrigger>
    </motion.header>
  );
}
