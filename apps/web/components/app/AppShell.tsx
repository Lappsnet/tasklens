"use client";

/* U4 AppShell: desktop collapsible sidebar, topbar (breadcrumb, ⌘K palette,
   bell, user menu), mobile bottom tab bar with raised center action + "Más"
   sheet. Route transitions cross-fade + slide 8 px. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Gear, List, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Avatar, Badge, Button, ComboField, Dialog, DialogTrigger, Menu, Sheet } from "@/components/ui";
import { browserAuth, demoLogout, hasSupabaseBrowser } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { roleHome, roleLabel, roleLinks, roleMenu } from "@/components/site/nav";

interface Me {
  role: string;
  demo: boolean;
}

const CRUMBS: Record<string, { es: string; en: string }> = {
  inicio: { es: "Inicio", en: "Home" },
  scan: { es: "Escaneo", en: "Scan" },
  quote: { es: "Cotización", en: "Quote" },
  book: { es: "Reserva", en: "Book" },
  jobs: { es: "Trabajos", en: "Jobs" },
  pro: { es: "Pro", en: "Pro" },
  contracts: { es: "Contrato", en: "Contract" },
  passport: { es: "Pasaporte", en: "Passport" },
  projects: { es: "Proyectos", en: "Projects" },
  fund: { es: "Pago", en: "Pay" },
  city: { es: "Ciudad", en: "City" },
  admin: { es: "Admin", en: "Admin" },
  empresa: { es: "Empresa", en: "Company" },
  equipo: { es: "Equipo", en: "Team" },
  calendar: { es: "Calendario", en: "Calendar" },
  ajustes: { es: "Ajustes", en: "Settings" },
  apply: { es: "Solicitud", en: "Apply" },
  pros: { es: "Solicitudes", en: "Requests" },
  new: { es: "Nuevo", en: "New" },
  dev: { es: "Kit", en: "Kit" },
};

function crumbs(path: string, lang: Lang): string[] {
  return path
    .split("/")
    .filter((s) => s && !/^[0-9a-f-]{8,}$/i.test(s) && s !== "new" && s !== "token")
    .map((s) => CRUMBS[s]?.[lang] ?? s);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("es");
  const [me, setMe] = useState<Me | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentJobs, setRecentJobs] = useState<{ id: string; status: string; price_usd: number }[]>([]);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    try {
      setCollapsed(window.localStorage.getItem("tasklens:rail") === "1");
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          setMe((await res.json()) as Me);
          const jr = await fetch("/api/jobs");
          if (jr.ok) {
            const j = (await jr.json()) as { jobs?: { id: string; status: string; price_usd: number }[] };
            setRecentJobs((j.jobs ?? []).slice(0, 8));
          }
        }
      } catch {
        /* offline */
      }
    })();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleRail() {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem("tasklens:rail", c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  const signOut = useCallback(async () => {
    try {
      await demoLogout();
      if (hasSupabaseBrowser()) await browserAuth().auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }, []);

  const role = me?.role ?? "customer";
  const menu = useMemo(() => roleMenu(role, lang), [role, lang]);
  const mobileTabs = useMemo(() => menu.tabs.filter((t) => t.mobile).slice(0, 4), [menu]);
  const isActive = useCallback((href: string) => path === href || (href !== "/" && path.startsWith(href + "/")), [path]);

  const paletteItems = useMemo(() => {
    const nav = menu.tabs.map((t) => ({ id: `nav:${t.href}`, label: t.label, hint: t.href }));
    const jobs = recentJobs.map((j) => ({ id: `job:/jobs/${j.id}`, label: `${j.id.slice(0, 8)}… · ${j.status} · $${j.price_usd}`, hint: "/jobs" }));
    return [...nav, ...jobs];
  }, [menu, recentJobs]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-all duration-200 lg:flex ${collapsed ? "w-16" : "w-60"}`}>
        <div className="flex h-[76px] items-center justify-between px-4">
          {!collapsed && (
            <Link href={roleHome(role)} className="flex items-center gap-2" aria-label="TaskLens">
              <span className="relative inline-block h-6 w-6" aria-hidden="true">
                <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l-[3px] border-t-[3px] border-signal rounded-tl" />
                <span className="absolute right-0 top-0 h-2.5 w-2.5 border-r-[3px] border-t-[3px] border-signal rounded-tr" />
                <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-[3px] border-l-[3px] border-signal rounded-bl" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-[3px] border-r-[3px] border-signal rounded-br" />
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight">TaskLens</span>
            </Link>
          )}
          <button type="button" onClick={toggleRail} aria-label={collapsed ? "expand" : "collapse"} className="rounded-btn p-2 text-muted hover:bg-ink/5 hover-tint">
            <List size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 overflow-auto px-2" aria-label="app">
          <p className="px-2 pb-1 font-mono text-[11px] uppercase tracking-widest text-muted">{roleLabel(role, lang)}</p>
          {menu.tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative mb-0.5 flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-semibold outline-none transition-colors ${active ? "text-ink" : "text-muted hover:text-ink hover-tint"}`}
              >
                {active && (
                  <motion.span layoutId="nav-edge" className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-signal" transition={{ duration: 0.2 }} />
                )}
                <tab.icon size={22} weight={active ? "fill" : "regular"} aria-hidden="true" className={active ? "text-signal" : ""} />
                {!collapsed && <span className="truncate">{tab.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-2">
          {!collapsed && me && (
            <div className="mb-1 flex items-center gap-2 px-2">
              <Avatar name={roleLabel(me.role, lang)} size={28} />
              <Badge status={me.role} />
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-4 backdrop-blur-md">
          <nav className="min-w-0 flex-1 truncate text-sm text-muted" aria-label="breadcrumb">
            {crumbs(path, lang).map((c, i, all) => (
              <span key={`${c}-${i}`}>
                {i > 0 && <span className="mx-1" aria-hidden="true">/</span>}
                <span className={i === all.length - 1 ? "font-bold text-ink" : ""}>{c}</span>
              </span>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-btn border border-line bg-surface px-3 py-1.5 text-sm text-muted sm:inline-flex"
            aria-label="command palette"
          >
            <MagnifyingGlass size={16} aria-hidden="true" />
            <kbd className="rounded border border-line bg-bg px-1 font-mono text-xs">⌘K</kbd>
          </button>
          {me ? (
            <>
              <Menu
                label={<Bell size={20} aria-label={strings.notifications} />}
                items={roleLinks(role, lang).map((l) => ({ id: l.href, label: l.label }))}
                onAction={(href) => router.push(href)}
              />
              <Menu
                label={
                  <span className="flex items-center gap-2">
                    <Avatar name={roleLabel(role, lang)} size={30} />
                    <Badge status={role} />
                  </span>
                }
                items={[
                  ...roleLinks(role, lang).map((l) => ({ id: `go:${l.href}`, label: l.label })),
                  { id: "signout", label: strings.signOut, danger: true },
                ]}
                onAction={(id) => {
                  if (id === "signout") signOut();
                  else if (id.startsWith("go:")) router.push(id.slice(3));
                }}
              />
            </>
          ) : (
            <Link href="/login" className="rounded-btn bg-ink px-4 py-2 text-sm font-semibold text-bg">
              {strings.signIn}
            </Link>
          )}
        </header>

        {/* Route transition */}
        <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-4 lg:pb-16">
          <AnimatePresence mode="wait">
            <motion.main
              key={path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        {/* Mobile tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden" aria-label="mobile">
          <div className="mx-auto flex w-full max-w-md items-end px-1 pb-[env(safe-area-inset-bottom)]">
            {mobileTabs.slice(0, 2).map((tab) => (
              <div key={tab.href + tab.label} className="flex-1"><TabButton tab={tab} active={isActive(tab.href)} /></div>
            ))}
            <div className="flex flex-1 justify-center">
              {menu.center && (
                <Link
                  href={menu.center.href}
                  aria-label={menu.center.label}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-signal text-[var(--signal-ink)] shadow-lifted transition active:scale-95"
                >
                  <menu.center.icon size={26} weight="fill" aria-hidden="true" />
                </Link>
              )}
            </div>
            {mobileTabs.slice(2, 4).map((tab) => (
              <div key={tab.href + tab.label} className="flex-1"><TabButton tab={tab} active={isActive(tab.href)} /></div>
            ))}
            <div className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted"
                aria-label={strings.menu}
              >
                <List size={24} aria-hidden="true" />
                {strings.menu}
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Más sheet */}
      <DialogTrigger isOpen={moreOpen} onOpenChange={setMoreOpen}>
        <span className="hidden" aria-hidden="true" />
        <Sheet title={strings.menu}>
          <div className="grid gap-1">
            {menu.tabs.map((tab) => (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-semibold hover-tint"
              >
                <tab.icon size={22} aria-hidden="true" className="text-blueprint" />
                {tab.label}
              </Link>
            ))}
            <Link href="/ajustes" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-semibold hover-tint">
              <Gear size={22} aria-hidden="true" className="text-blueprint" />
              {lang === "es" ? "Ajustes" : "Settings"}
            </Link>
            {me && (
              <Button variant="ghost" onPress={() => { setMoreOpen(false); signOut(); }}>
                <SignOut size={18} aria-hidden="true" /> {strings.signOut}
              </Button>
            )}
          </div>
        </Sheet>
      </DialogTrigger>

      {/* Command palette */}
      <DialogTrigger isOpen={paletteOpen} onOpenChange={setPaletteOpen}>
        <span className="hidden" aria-hidden="true" />
        <Dialog title={strings.menu}>
          <PaletteBody
            items={paletteItems}
            onPick={(id) => {
              setPaletteOpen(false);
              const href = id.startsWith("job:") ? id.slice(4) : id.startsWith("nav:") ? id.slice(4) : id;
              router.push(href);
            }}
          />
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

function TabButton({ tab, active }: { tab: { href: string; label: string; icon: Icon }; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-signal" : "text-muted"}`}
    >
      <tab.icon size={24} weight={active ? "fill" : "regular"} aria-hidden="true" />
      {tab.label}
    </Link>
  );
}

function PaletteBody({ items, onPick }: { items: { id: string; label: string; hint: string }[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  return (
    <ComboField
      label=""
      aria-label="palette"
      items={filtered.map((f) => ({ id: f.id, label: f.label }))}
      inputValue={q}
      onInputChange={setQ}
      onSelectionChange={(k) => {
        if (k) onPick(String(k));
      }}
    />
  );
}
