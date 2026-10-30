"use client";

/* U3 connect-glasses: mint a pairing code, show QR + deep link, poll status.
   Honest about the developer preview; phone camera is always one tap away. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button, Field, Input } from "@/components/ui";
import { browserAuth, hasSupabaseBrowser } from "@/lib/auth-client";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

type Status = "waiting" | "phone_connected" | "glasses_ready" | "expired" | "claimed";

export default function ConnectGlassesPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pairing, setPairing] = useState<{ id: string; code: string; deepLink: string; qrDataUrl: string | null; expiresAt: number } | null>(null);
  const [status, setStatus] = useState<Status>("waiting");
  const [copied, setCopied] = useState(false);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        setAuthed(res.ok);
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!pairing) return;
    const t0 = setInterval(async () => {
      try {
        const res = await fetch(`/api/glasses/pairings?id=${encodeURIComponent(pairing.id)}`);
        if (!res.ok) return;
        const j = (await res.json()) as { status: Status };
        setStatus(j.status);
        if (j.status === "glasses_ready" || j.status === "expired") clearInterval(t0);
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(t0);
  }, [pairing]);

  async function sendLink() {
    setError("");
    if (!email.includes("@") || !hasSupabaseBrowser()) {
      setError(strings.errorGeneric);
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
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function mint() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/glasses/pairings", { method: "POST" });
      const j = (await res.json()) as { id: string; code: string; deepLink: string; qrSvg: string | null; expiresAt: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? strings.errorGeneric);
      const qrDataUrl = j.qrSvg ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(j.qrSvg)))}` : null;
      setPairing({ id: j.id, code: j.code, deepLink: j.deepLink, qrDataUrl, expiresAt: j.expiresAt });
      setStatus("waiting");
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(pairing?.code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const steps: { key: Status; label: string; done: boolean; active: boolean }[] = [
    { key: "waiting", label: strings.gWaiting, done: status !== "waiting", active: status === "waiting" },
    { key: "phone_connected", label: strings.gPhone, done: status === "glasses_ready", active: status === "phone_connected" },
    { key: "glasses_ready", label: strings.gReady, done: status === "glasses_ready", active: false },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">{strings.gTitle}</h1>
      <p className="mt-2 text-sm text-muted">{strings.gBody}</p>
      {error && <p className="err mt-3" role="alert">{error}</p>}

      {authed === false && !sent && (
        <section className="card mt-4" aria-label={strings.withPhone}>
          <Field label={strings.emailLabel}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" inputMode="email" />
          </Field>
          <Button size="lg" variant="accent" loading={busy} onPress={sendLink} className="mt-2">
            {strings.sendLink}
          </Button>
        </section>
      )}
      {sent && authed === false && (
        <section className="card mt-4 text-center" aria-label={strings.linkSentTitle}>
          <p className="font-bold">{strings.linkSentTitle}</p>
          <p className="mt-1 text-sm text-muted">{strings.linkSentBody}</p>
          <button type="button" className="link mt-2 text-sm" onClick={() => window.location.reload()}>
            {lang === "es" ? "Ya hice clic — continuar" : "I clicked the link — continue"}
          </button>
        </section>
      )}

      {authed && !pairing && (
        <Button size="lg" variant="accent" loading={busy} onPress={mint} className="mt-4">
          {strings.gPair}
        </Button>
      )}

      {authed && pairing && (
        <section className="card highlight mt-4 text-center" aria-label={strings.gPair}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pairing.qrDataUrl && <img src={pairing.qrDataUrl} alt={pairing.code} className="mx-auto rounded-btn" width={220} height={220} />}
          <div className="mt-2 font-mono text-4xl font-bold tracking-[0.3em]">{pairing.code}</div>
          <p className="mt-1 text-xs text-muted">{strings.gCodeValid}</p>
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="secondary" onPress={copy}>{copied ? `✓ ${strings.shareCopied}` : strings.copyCode}</Button>
            <a href={pairing.deepLink} className="rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg">
              {lang === "es" ? "Abrir app compañera" : "Open companion app"}
            </a>
          </div>
          <ol className="mt-4 space-y-2 text-left">
            {steps.map((s) => (
              <li key={s.key} className={s.active ? "font-bold" : s.done ? "text-muted" : "text-muted"}>
                {s.done ? <Check className="mr-1 inline text-verified" aria-hidden="true" /> : s.active ? "… " : "○ "}
                {s.label}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link href="/scan" className="btn btn-secondary mt-4 inline-block w-full text-center">
        {strings.gFallback}
      </Link>
    </div>
  );
}
