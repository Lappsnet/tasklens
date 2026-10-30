"use client";

/* U3 shared auth flow: who (role) -> how (phone / glasses) -> sent -> profile.
   Login ends at the role home; signup adds the minimal profile step. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bank, Buildings, DeviceMobile, Eyeglasses, House, Wrench, EnvelopeSimple } from "@phosphor-icons/react";
import { Button, Field, Input, Sheet } from "@/components/ui";
import { useCountUp } from "@/components/ui";
import { browserAuth, demoLogin, hasSupabaseBrowser } from "@/lib/auth-client";
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
  const [method, setMethod] = useState<"phone" | "glasses" | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
  const cd = useCountUp(cooldown, 1000);

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
    const t0 = setInterval(() => {
      checkSession().then((ok) => {
        if (ok && mode === "login" && role) {
          clearInterval(t0);
          router.push(roleHome(role));
        }
      });
    }, 3000);
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
      if (error) throw new Error(error.message);
      setSent(true);
      setCooldown(30);
    } catch {
      setError(strings.errorGeneric);
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
    const ok = await demoLogin(r, r === "city_operator" ? opCity : undefined);
    if (ok) router.push(roleHome(r));
    else setError(strings.errorGeneric);
  }

  const supa = hasSupabaseBrowser();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">{mode === "login" ? strings.loginTitle : strings.signUp}</h1>
        <div className="seg" role="group" aria-label={strings.langLabel}>
          {(["es", "en"] as Lang[]).map((l) => (
            <button key={l} type="button" className={lang === l ? "on" : ""} onClick={() => pickLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">{mode === "login" ? strings.loginSub : strings.whoSub}</p>
      {error && <p className="err mb-3" role="alert">{error}</p>}

      {/* Step 1 — role */}
      {!role && (
        <section aria-label={strings.whoTitle}>
          <h2 className="mb-2 font-bold">{strings.whoTitle}</h2>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className="rounded-card border border-line bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-blueprint hover:shadow-lifted"
              >
                <r.icon size={26} weight="duotone" className="text-blueprint" aria-hidden="true" />
                <div className="mt-2 text-sm font-bold">{r.key === "customer" ? strings.roleCustomer : r.key === "pro" ? strings.rolePro : r.key === "company" ? strings.roleCompany : strings.roleCity}</div>
                <div className="mt-0.5 text-xs text-muted">{strings[ROLE_DESC[r.key]]}</div>
                {r.verify && <div className="mt-1.5 inline-block rounded-full bg-muted/15 px-2 py-0.5 text-[11px] font-bold text-muted">{strings.needVerify}</div>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2 — method */}
      {role && !method && !hasSession && (
        <section aria-label={strings.howTitle}>
          <button type="button" className="link mb-2 text-sm" onClick={() => setRole(null)}>← {strings.whoTitle}</button>
          <h2 className="mb-1 font-bold">{strings.howTitle}</h2>
          <p className="mb-2 text-sm text-muted">{strings.howSub}</p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-blueprint hover:shadow-lifted"
            >
              <DeviceMobile size={26} weight="duotone" className="mt-0.5 shrink-0 text-blueprint" aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold">{strings.withPhone}</span>
                <span className="block text-xs text-muted">{strings.withPhoneD}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/connect-glasses")}
              className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-blueprint hover:shadow-lifted"
            >
              <Eyeglasses size={26} weight="duotone" className="mt-0.5 shrink-0 text-blueprint" aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold">{strings.withGlasses}</span>
                <span className="block text-xs text-muted">{strings.withGlassesD}</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Phone method */}
      {role && method === "phone" && !sent && (
        <section aria-label={strings.withPhone}>
          <button type="button" className="link mb-2 text-sm" onClick={() => setMethod(null)}>← {strings.howTitle}</button>
          <Field label={strings.emailLabel}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" inputMode="email" />
          </Field>
          <Field label={`${strings.phoneLabel} (${lang === "es" ? "opcional" : "optional"})`}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={strings.phonePh} inputMode="tel" />
          </Field>
          <Button size="lg" variant="accent" loading={busy} onPress={sendLink} className="mt-2">
            {strings.sendLink}
          </Button>
        </section>
      )}

      {/* Sent state */}
      {sent && !hasSession && (
        <section aria-label={strings.linkSentTitle} className="pop-in rounded-card border border-line bg-surface p-6 text-center shadow-soft">
          <EnvelopeSimple size={40} weight="duotone" className="mx-auto text-blueprint" aria-hidden="true" />
          <h2 className="mt-2 font-display text-xl font-bold">{strings.linkSentTitle}</h2>
          <p className="mt-1 text-sm text-muted">{strings.linkSentBody}</p>
          <p className="mt-1 font-mono text-sm font-semibold">{email}</p>
          <Button variant="secondary" className="mt-3" isDisabled={cooldown > 0 || busy} onPress={sendLink}>
            {cooldown > 0 ? `${strings.resendIn} ${cd}s` : strings.resendLink}
          </Button>
          <div className="mt-2">
            <button type="button" className="link text-sm" onClick={() => checkSession()}>{lang === "es" ? "Ya hice clic — continuar" : "I clicked the link — continue"}</button>
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
          <Link href={nextLabel(role, strings).href} className="btn-glow btn-sheen mt-3 inline-block rounded-btn bg-signal px-6 py-3 font-bold text-[var(--signal-ink)]">
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
              <label className="lbl" htmlFor="demo-city">{strings.cityTitle}</label>
              <select id="demo-city" value={opCity} onChange={(e) => setOpCity(e.target.value)} className="w-full rounded-input border border-line bg-surface px-3 py-2.5">
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}, {c.country}</option>
                ))}
              </select>
              <Button variant="secondary" onPress={() => demo("city_operator")}>{strings.roleCity}</Button>
              <p className="text-xs text-muted">{strings.demoNote}</p>
            </div>
          </Sheet>
        </DialogTrigger>
      </div>
    </div>
  );
}
