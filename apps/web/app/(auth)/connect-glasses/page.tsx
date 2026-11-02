"use client";

/* U3 connect-glasses: mint a pairing code, show QR + deep link, poll status.
   Honest about the developer preview; phone camera is always one tap away. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button, Card, ErrorState, Field, Input } from "@/components/ui";
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
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      {authed === false && !sent && (
        <Card aria-label={strings.withPhone}>
          <Field label={strings.emailLabel}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" inputMode="email" />
          </Field>
          <Button size="lg" variant="accent" loading={busy} onPress={sendLink} className="mt-2">
            {strings.sendLink}
          </Button>
        </Card>
      )}
      {sent && authed === false && (
        <Card className="text-center" aria-label={strings.linkSentTitle}>
          <p className="font-bold">{strings.linkSentTitle}</p>
          <p className="mt-1 text-sm text-muted">{strings.linkSentBody}</p>
          <Button variant="ghost" className="mt-2 text-sm" onPress={() => window.location.reload()}>
            {lang === "es" ? "Ya hice clic — continuar" : "I clicked the link — continue"}
          </Button>
        </Card>
      )}

      {authed && !pairing && (
        <Button size="lg" variant="accent" loading={busy} onPress={mint} className="mt-4">
          {strings.gPair}
        </Button>
      )}

      {authed && pairing && (
        <Card className="border-signal text-center shadow-lifted" aria-label={strings.gPair}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pairing.qrDataUrl && <img src={pairing.qrDataUrl} alt={pairing.code} className="mx-auto h-[200px] w-[200px] rounded-btn border border-line bg-white p-2" />}
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="font-mono text-5xl font-bold tracking-[0.2em]" role="img" aria-label={`${strings.gPair}: ${pairing.code}`}>{pairing.code}</div>
          </div>
          <p className="mt-1 text-xs text-muted">{strings.gCodeValid}</p>
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="secondary" onPress={copy}>{copied ? `✓ ${strings.shareCopied}` : strings.copyCode}</Button>
            <a href={pairing.deepLink} className="inline-flex items-center justify-center gap-2 rounded-btn border border-ink bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-bg">
              {lang === "es" ? "Abrir app compañera" : "Open companion app"}
            </a>
          </div>
          <ol className="mt-5 space-y-0 text-left">
            {steps.map((s, i) => (
              <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 transition-colors duration-500 ${s.done ? "bg-[var(--verified)]" : "bg-line"}`} aria-hidden="true" />
                )}
                <span
                  className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-all duration-500 ${s.done ? "bg-[var(--verified)] text-white" : s.active ? "bg-signal text-[var(--signal-ink)] shadow-[0_0_0_4px_var(--signal-soft,rgba(242,106,27,0.2))]" : "bg-ink/10 text-muted"}`}
                  aria-hidden="true"
                >
                  {s.done ? <Check size={14} weight="bold" /> : s.active ? <span className="pulse-dot h-2 w-2 rounded-full bg-current" /> : i + 1}
                </span>
                <span className={`pt-1 text-sm transition-colors duration-300 ${s.active ? "font-bold text-ink" : s.done ? "text-muted" : "text-muted"}`}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {lang === "es"
              ? "Abre TaskLens en tu Android, apunta con la cámara al código o tócalo para conectar. El código vence en 10 minutos y es de un solo uso."
              : "Open TaskLens on your Android, point the camera at the code or tap it to connect. The code expires in 10 minutes and is single-use."}
          </p>
        </Card>
      )}

      <a href="/scan" className="mt-4 inline-block w-full rounded-btn border border-ink bg-surface px-4 py-2.5 text-center text-sm font-semibold hover:bg-ink hover:text-bg">
        {strings.gFallback}
      </a>
    </div>
  );
}
