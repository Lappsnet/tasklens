"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserAuth, demoLogin, demoLoginServer, hasSupabaseBrowser } from "@/lib/auth-client";
import { CITIES } from "@/lib/cities";
import { t, type Lang } from "@/lib/i18n";

type DemoRole = "customer" | "pro" | "admin" | "city_operator";

export default function LoginPage() {
  const router = useRouter();
  const [lang] = useState<Lang>("en");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [opCity, setOpCity] = useState(CITIES[0].slug);
  const strings = t(lang);
  const configured = hasSupabaseBrowser();

  async function magicLink() {
    setError("");
    try {
      const { error } = await browserAuth().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/scan` },
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError(strings.errorGeneric);
    }
  }

  async function demo(role: DemoRole) {
    setError("");
    const ok = await demoLogin(role, role === "city_operator" ? opCity : undefined);
    if (ok) router.push(role === "pro" ? "/pro" : role === "admin" ? "/admin" : role === "city_operator" ? "/city" : "/scan");
    else setError(strings.errorGeneric);
  }

  /** Production one-click demo (seeded Supabase accounts). Admin is never one click. */
  async function demoServer(role: "customer" | "pro") {
    setError("");
    if (await demoLoginServer(role)) router.push(role === "pro" ? "/pro" : "/scan");
    else setError(strings.errorGeneric);
  }

  return (
    <main>
      <h1>{strings.loginTitle}</h1>
      <p className="muted">{strings.loginSub}</p>
      {configured ? (
        <>
          <section className="card">
            <label className="lbl" htmlFor="email">{strings.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }}
            />
            <button type="button" className="btn big" disabled={!email} onClick={magicLink}>
              {strings.magicLink}
            </button>
            {sent && <p className="muted" role="status">{strings.magicSent}</p>}
          </section>
          <section className="card">
            <p className="muted small">{strings.tryDemo}</p>
            <div className="row">
              {(["customer", "pro"] as const).map((r) => (
                <button key={r} type="button" className="btn btn-secondary" onClick={() => demoServer(r)}>
                  {r}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="card">
          <p className="muted small">{strings.demoNote}</p>
          <div className="row">
            {(["customer", "pro", "admin"] as const).map((r) => (
              <button key={r} type="button" className="btn btn-secondary" onClick={() => demo(r)}>
                {r}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <select
              aria-label="operator city"
              value={opCity}
              onChange={(e) => setOpCity(e.target.value)}
              style={{ border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }}
            >
              {CITIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}, {c.country}</option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary" onClick={() => demo("city_operator")}>
              city_operator
            </button>
          </div>
        </section>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </main>
  );
}
