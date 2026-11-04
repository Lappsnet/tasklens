"use client";

/* U3 shared auth flow: who (role) -> how (phone / glasses) -> sent -> profile.
   Login ends at the role home; signup adds the minimal profile step. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bank, Buildings, Check, House, Wrench, EnvelopeSimple } from "@phosphor-icons/react";
import { Button, ErrorState, Field, Input, Select, Sheet } from "@/components/ui";
import { BRAND_IMAGES } from "@/content/showcase";
import { browserAuth, demoLogin, demoLoginServer, hasSupabaseBrowser } from "@/lib/auth-client";
import { CITIES } from "@/lib/cities";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import type { RoleKey } from "@/components/site/nav";
import { DialogTrigger } from "@/components/ui";

const ROLES: { key: Exclude<RoleKey, "admin">; icon: typeof House; verify: boolean }[] = [
  { key: "customer", icon: House, verify: false },
  { key: "pro", icon: Wrench, verify: false },
  { key: "company", icon: Buildings, verify: true },
  { key: "city_operator", icon: Bank, verify: true },
];

const ROLE_DESC: Record<Exclude<RoleKey, "admin">, "clienteDesc" | "proDesc" | "empresaDesc" | "alcaldiaDesc"> = {
  customer: "clienteDesc",
  pro: "proDesc",
  company: "empresaDesc",
  city_operator: "alcaldiaDesc",
};

function roleHome(role: RoleKey): string {
  switch (role) {
    case "pro":
    case "company":
      return "/pro";
    case "city_operator":
      return "/city";
    default:
      return "/scan";
  }
}

function nextLabel(role: RoleKey, s: ReturnType<typeof t>): { title: string; href: string; cta: string } {
  switch (role) {
    case "pro":
    case "company":
      return { title: s.nextTitle, href: "/pro/apply", cta: s.applySubmit };
    case "city_operator":
      return { title: s.nextTitle, href: "/city", cta: s.cityTitle };
    default:
      return { title: s.nextTitle, href: "/scan", cta: s.startScan };
  }
}

export default function AuthFlow({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>("es");
  const [role, setRole] = useState<RoleKey | null>(null);
  const [roleOk, setRoleOk] = useState(false);
  const [method, setMethod] = useState<"phone" | "glasses" | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [authTab, setAuthTab] = useState<"magic" | "password">("password");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  // signup profile
  const [name, setName] = useState("");
  const [city, setCity] = useState("san-salvador");
  const [saved, setSaved] = useState(false);
  const [opCity, setOpCity] = useState("san-salvador");
  const strings = t(lang);
  const glassesThumb = BRAND_IMAGES.find((b) => b.id === "lentes-meta-display-detalle") ?? BRAND_IMAGES[0];
  const doneStep = saved || hasSession;
  const step = doneStep ? 3 : !roleOk ? 1 : 2;
  const stepLabels = [strings.whoTitle, strings.howTitle, strings.profileTitle];

  useEffect(() => {
    const savedLang = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (savedLang === "en" || savedLang === "es") setLang(savedLang);
    if (params.get("error") === "link") setError(strings.linkError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t0 = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t0);
  }, [cooldown]);

  async function checkSession() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const j = (await res.json()) as { role?: string };
        if (j.role) {
          setHasSession(true);
          if (!role && (j.role === "customer" || j.role === "pro" || j.role === "company" || j.role === "city_operator")) {
            setRole(j.role as RoleKey);
          }
          return true;
        }
      }
    } catch {
      /* not signed in */
    }
    return false;
  }

  useEffect(() => {
    if (!sent && mode === "login") return;
    // Quiet poll: /api/auth/me 401s while logged out, which spams DevTools.
    // 5s cadence, stops after ~5 min or on success.
    let tries = 0;
    const t0 = setInterval(() => {
      tries += 1;
      if (tries > 60) {
        clearInterval(t0);
        return;
      }
      checkSession().then((ok) => {
        if (ok && mode === "login" && role) {
          clearInterval(t0);
          router.push(roleHome(role));
        }
      });
    }, 5000);
    return () => clearInterval(t0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent, mode]);

  function pickLang(l: Lang) {
    setLang(l);
    try {
      window.localStorage.setItem("tasklens:lang", l);
      document.cookie = `tasklens:lang=${l}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
  }

  async function sendLink() {
    setError("");
    if (!email.includes("@")) {
      setError(strings.errorGeneric);
      return;
    }
    if (!hasSupabaseBrowser()) {
      setError(strings.demoNote);
      return;
    }
    setBusy(true);
    try {
      const { error } = await browserAuth().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      setSent(true);
      setCooldown(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  /** GoTrue errors are cryptic codes (422 with "User already registered" etc):
      map the common ones to friendly EN/ES strings. */
  function friendlyAuthError(raw: string): string {
    const msg = raw.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
      return strings.emailInUse;
    }
    if (msg.includes("signups are disabled") || msg.includes("signup") && msg.includes("disabled")) {
      return strings.signupDisabled;
    }
    if (msg.includes("password") && (msg.includes("short") || msg.includes("weak") || msg.includes("6 character"))) {
      return strings.passwordTooShort;
    }
    if (msg.includes("confirm") || msg.includes("not confirmed") || msg.includes("email not confirmed")) {
      return strings.emailNotConfirmed;
    }
    if (msg.includes("invalid login credentials")) {
      return mode === "signup" ? strings.emailInUse : raw;
    }
    return raw;
  }

  async function signWithPassword() {
    setError("");
    if (!email.includes("@")) {
      setError(strings.errorGeneric);
      return;
    }
    if ((password ?? "").length < 8) {
      setError(strings.passwordTooShort);
      return;
    }
    if (!hasSupabaseBrowser()) {
      setError(strings.demoNote);
      return;
    }
    setBusy(true);
    try {
      const client = browserAuth();
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw new Error(friendlyAuthError(error.message));
        // If Confirm-email is ON, Supabase sends a confirmation email and
        // returns a user without session: tell the user to check inbox/spam.
        if (!data.session) {
          setSent(true);
          setCooldown(30);
          return;
        }
        await checkSession();
        router.push(roleHome(role ?? "customer"));
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("confirm") || msg.includes("verif")) throw new Error(strings.emailNotConfirmed);
          throw new Error(friendlyAuthError(error.message));
        }
        const ok = await checkSession();
        if (ok && role) router.push(roleHome(role));
        else if (ok) router.push("/scan");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setError("");
    if (name.trim().length < 2) {
      setError(strings.errorGeneric);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name.trim(), phone: phone.trim() || undefined, city_slug: city }),
      });
      if (!res.ok) throw new Error(strings.errorGeneric);
      setSaved(true);
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function demo(r: RoleKey) {
    // Production (Supabase): server signs into the seeded account. Local demo:
    // role cookie. Company/alcaldía one-click exists locally only by design.
    if (hasSupabaseBrowser()) {
      if (r !== "customer" && r !== "pro") {
        setError(strings.demoNote);
        return;
      }
      const ok = await demoLoginServer(r);
      if (ok) router.push(roleHome(r));
      else setError(strings.errorGeneric);
      return;
    }
    const ok = await demoLogin(r, r === "city_operator" ? opCity : undefined);
    if (ok) router.push(roleHome(r));
    else setError(strings.errorGeneric);
  }

  const supa = hasSupabaseBrowser();

  return (
    <div>
      {/* V5 step indicator */}
      <ol className="mb-6 flex items-center gap-1.5" aria-label={`${strings.whoTitle} / ${strings.howTitle} / ${strings.profileTitle}`}>
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-1.5 last:flex-none">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors duration-200 ${done ? "bg-[var(--verified)] text-white" : active ? "bg-ink text-bg" : "bg-ink/10 text-muted"}`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`hidden text-xs font-semibold sm:block ${active ? "text-ink" : "text-muted"}`}>{label}</span>
              {n < 3 && <span className={`h-px flex-1 ${done ? "bg-[var(--verified)]" : "bg-line"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">{mode === "login" ? strings.loginTitle : strings.signUp}</h1>
        <div className="flex gap-1" role="group" aria-label={strings.langLabel}>
          {(["es", "en"] as Lang[]).map((l) => (
            <Button key={l} variant={lang === l ? "primary" : "secondary"} className="px-3 py-1.5 text-sm" onPress={() => pickLang(l)}>
              {l.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">{mode === "login" ? strings.loginSub : strings.whoSub}</p>
      {error && <ErrorState message={error} onRetry={() => { setError(""); checkSession(); }} />}

      {/* Step 1 — role: large cards, tinted icon squares, orange selected state */}
      {!roleOk && (
        <section aria-label={strings.whoTitle}>
          <h2 className="mb-2 font-bold">{strings.whoTitle}</h2>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={strings.whoTitle}>
            {ROLES.map((r) => {
              const selected = role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(r.key)}
                  className={`relative min-h-[120px] rounded-card border-2 bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted ${selected ? "border-signal shadow-lifted" : "border-line hover:border-blueprint"}`}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-signal text-[var(--signal-ink)]" aria-hidden="true">
                      <Check size={14} weight="bold" />
                    </span>
                  )}
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-[var(--blueprint)]/10" aria-hidden="true">
                    <r.icon size={24} weight="duotone" className="text-blueprint" />
                  </span>
                  <div className="mt-2 text-sm font-bold">{r.key === "customer" ? strings.roleCustomer : r.key === "pro" ? strings.rolePro : r.key === "company" ? strings.roleCompany : strings.roleCity}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted">{strings[ROLE_DESC[r.key]]}</div>
                  {r.verify && <div className="mt-1.5 inline-block rounded-full bg-muted/15 px-2 py-0.5 text-[11px] font-bold text-muted">{strings.needVerify}</div>}
                </button>
              );
            })}
          </div>
          <Button size="lg" variant="accent" className="mt-4 w-full" isDisabled={!role} onPress={() => setRoleOk(true)}>
            {lang === "es" ? "Continuar" : "Continue"}
          </Button>
        </section>
      )}

      {/* Step 2 — method */}
      {roleOk && role && !method && !hasSession && (
        <section aria-label={strings.howTitle}>
          <Button variant="ghost" className="mb-2 text-sm" onPress={() => setRoleOk(false)}>← {strings.whoTitle}</Button>
          <h2 className="mb-1 font-bold">{strings.howTitle}</h2>
          <p className="mb-2 text-sm text-muted">{strings.howSub}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className="overflow-hidden rounded-card border border-line bg-surface text-left shadow-soft transition hover:-translate-y-0.5 hover:border-blueprint hover:shadow-lifted"
            >
              <div className="flex h-28 items-center justify-center bg-[#0A1220]" aria-hidden="true">
                <span className="relative block h-20 w-11 rounded-lg border-2 border-white/70 bg-[#16263f]">
                  <span className="absolute inset-x-1.5 top-1.5 h-8 rounded-sm bg-[var(--signal)]/80" />
                  <span className="absolute inset-x-1.5 top-11 space-y-1">
                    <span className="block h-1 rounded bg-white/50" />
                    <span className="block h-1 rounded bg-white/30" />
                    <span className="block h-1 w-2/3 rounded bg-white/30" />
                  </span>
                  <span className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-white/50" />
                </span>
              </div>
              <span className="block p-4">
                <span className="block text-sm font-bold">{strings.withPhone}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{strings.withPhoneD}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/connect-glasses")}
              className="overflow-hidden rounded-card border border-line bg-surface text-left shadow-soft transition hover:-translate-y-0.5 hover:border-blueprint hover:shadow-lifted"
            >
              <div className="relative h-28 overflow-hidden bg-[#0A1220]" aria-hidden="true">
                {glassesThumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={glassesThumb.image.src}
                    width={glassesThumb.image.width}
                    height={glassesThumb.image.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover opacity-90"
                  />
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-signal px-2.5 py-1 text-[11px] font-bold text-[var(--signal-ink)]">Fix this</span>
              </div>
              <span className="block p-4">
                <span className="block text-sm font-bold">{strings.withGlasses}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{strings.withGlassesD}</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Phone method */}
      {roleOk && role && method === "phone" && !sent && (
        <section aria-label={strings.withPhone}>
          <Button variant="ghost" className="mb-2 text-sm" onPress={() => setMethod(null)}>← {strings.howTitle}</Button>
          <div className="mb-3 inline-flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label={strings.withPhone}>
            {(["password", "magic"] as const).map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={authTab === tab} onClick={() => setAuthTab(tab)}
                className={"rounded-full px-4 py-2 text-sm font-semibold transition-colors " + (authTab === tab ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
                {tab === "magic" ? strings.authTabMagic : strings.authTabPassword}
              </button>
            ))}
          </div>
          <Field label={strings.emailLabel}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" inputMode="email" />
          </Field>
          {authTab === "password" && (
            <Field label={strings.passwordLabel}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={strings.passwordPh} maxLength={128} />
            </Field>
          )}
          <Field label={`${strings.phoneLabel} (${lang === "es" ? "opcional" : "optional"})`}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={strings.phonePh} inputMode="tel" />
          </Field>
          {authTab === "magic" ? (
            <>
              <Button size="lg" variant="accent" loading={busy} onPress={sendLink} className="mt-2">
                {strings.sendLink}
              </Button>
              <p className="mt-2 text-xs text-muted">{strings.checkSpamNote}</p>
            </>
          ) : (
            <Button size="lg" variant="accent" loading={busy} onPress={signWithPassword} className="mt-2">
              {mode === "signup" ? strings.passwordSignup : strings.passwordLogin}
            </Button>
          )}
        </section>
      )}

      {/* Sent state */}
      {sent && !hasSession && (
        <section aria-label={strings.linkSentTitle} className="pop-in rounded-card border border-line bg-surface p-6 text-center shadow-soft">
          <EnvelopeSimple size={40} weight="duotone" className="mx-auto text-blueprint" aria-hidden="true" />
          <h2 className="mt-2 font-display text-xl font-bold">{strings.linkSentTitle}</h2>
          <p className="mt-1 text-sm text-muted">{strings.linkSentBody}</p>
          <p className="mt-1 font-mono text-sm font-semibold">{email}</p>
          <p className="mt-2 text-xs text-muted">{strings.checkSpamNote}</p>
          <Button variant="secondary" className="mt-3" isDisabled={cooldown > 0 || busy} onPress={sendLink}>
            {cooldown > 0 ? `${strings.resendIn} ${cooldown}s` : strings.resendLink}
          </Button>
          <div className="mt-2">
            <Button variant="ghost" className="text-sm" onPress={() => checkSession()}>{lang === "es" ? "Ya hice clic — continuar" : "I clicked the link — continue"}</Button>
          </div>
        </section>
      )}

      {/* Signup step 3 — profile (once the session exists) */}
      {mode === "signup" && hasSession && !saved && (
        <section aria-label={strings.profileTitle} className="pop-in">
          <h2 className="mb-1 font-bold">{strings.profileTitle}</h2>
          <p className="mb-2 text-sm text-muted">{strings.profileSub}</p>
          <Field label={strings.proName}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
          <Field label={strings.cityLabelMuni}>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Salvador" maxLength={60} />
          </Field>
          <Button size="lg" variant="accent" loading={busy} onPress={saveProfile} className="mt-2">
            {strings.saveContinue}
          </Button>
        </section>
      )}

      {/* Done / signed in */}
      {(saved || (mode === "login" && hasSession && role)) && role && (
        <section aria-label={strings.nextTitle} className="pop-in rounded-card border border-verified bg-surface p-5 text-center shadow-soft">
          <h2 className="font-display text-xl font-bold">{strings.nextTitle}</h2>
          <p className="mt-1 text-sm text-muted">{nextLabel(role, strings).href === "/pro/apply" ? strings.needVerify : ""}</p>
          <Link href={nextLabel(role, strings).href} className="fx-glow fx-sheen mt-3 inline-block rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
            {nextLabel(role, strings).cta}
          </Link>
        </section>
      )}

      {/* Demo access */}
      <div className="mt-6 border-t border-line pt-4">
        <DialogTrigger>
          <Button variant="ghost">{strings.demoExplore}</Button>
          <Sheet title={strings.demoTitle}>
            <div className="grid gap-2">
              {(["customer", "pro", "company"] as RoleKey[]).map((r) => (
                <Button key={r} variant="secondary" onPress={() => demo(r)}>
                  {r === "customer" ? strings.roleCustomer : r === "pro" ? strings.rolePro : strings.roleCompany}
                </Button>
              ))}
              <Select
                label={strings.cityTitle}
                items={CITIES.map((c) => ({ id: c.slug, label: `${c.name}, ${c.country}` }))}
                selectedKey={opCity}
                onSelectionChange={(k) => setOpCity(String(k))}
              />
              <Button variant="secondary" onPress={() => demo("city_operator")}>{strings.roleCity}</Button>
              <p className="text-xs text-muted">{strings.demoNote}</p>
            </div>
          </Sheet>
        </DialogTrigger>
      </div>
    </div>
  );
}
