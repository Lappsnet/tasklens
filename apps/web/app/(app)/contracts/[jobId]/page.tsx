"use client";

import { use, useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, DrawCheck, EmptyState, ErrorState, Field, FlowNav, Input, Skeleton } from "@/components/ui";

interface Contract {
  id: string;
  job_id: string;
  status: string;
  title: string;
  body_es: string;
  body_en: string;
  summary_es: string;
  summary_en: string;
  price_usd: number;
  warranty_days: number;
  pdf_sha256?: string;
}

interface ChangeOrder {
  id: string;
  description: string;
  scope_delta: string;
  price_delta_usd: number;
  time_delta_hours: number;
  status: string;
}

export default function ContractPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [contract, setContract] = useState<Contract | null>(null);
  const [changes, setChanges] = useState<ChangeOrder[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "pro">("customer");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function load() {
    try {
      const res = await fetch("/api/contracts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const json = (await res.json()) as { contract?: Contract; error?: string };
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setContract(json.contract ?? null);
      const ch = await fetch(`/api/contracts/change?jobId=${encodeURIComponent(jobId)}`);
      if (ch.ok) {
        const cj = (await ch.json()) as { changes?: ChangeOrder[] };
        setChanges(cj.changes ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    const g = c.getContext("2d");
    g?.beginPath();
    g?.moveTo(p.clientX - r.left, p.clientY - r.top);
  }
  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    const g = c.getContext("2d");
    if (g) {
      g.lineWidth = 2;
      g.lineTo(p.clientX - r.left, p.clientY - r.top);
      g.stroke();
    }
  }

  async function requestCode() {
    if (!contract) return;
    setBusy(true);
    try {
      const res = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id, email }),
      });
      const json = (await res.json()) as { code?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "sign_failed");
      if (json.code) setCodeSent(json.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign_failed");
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!contract || !canvasRef.current) return;
    setBusy(true);
    setError("");
    try {
      const png = canvasRef.current.toDataURL("image/png");
      const res = await fetch("/api/contracts/sign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, contractId: contract.id, role, signerName: name, signaturePng: png, email, code }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "sign_failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign_failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    const res = await fetch("/api/contracts/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const json = (await res.json()) as { sha256?: string; error?: string };
    if (res.ok) setPdf(json.sha256 ?? "");
    else setError(json.error ?? "pdf_failed");
  }

  const body = lang === "es" ? contract?.body_es : contract?.body_en;
  const summary = lang === "es" ? contract?.summary_es : contract?.summary_en;

  return (
    <main>
      <h1 className="font-display text-2xl font-extrabold">{strings.contractTitle}</h1>
      {error && <ErrorState message={error} onRetry={load} />}
      {!contract && !error && <Skeleton className="h-48" />}
      {contract && (
        <>
          <section className="sticky top-14 z-10 rounded-card border border-signal bg-surface p-4 shadow-lifted" aria-label={strings.signTitle}>
            <div className="text-xs text-muted">{contract.title} · <Badge status={contract.status} /></div>
            <div className="font-display text-3xl font-extrabold">${contract.price_usd}</div>
            <p className="mt-1 text-sm text-muted" style={{ whiteSpace: "pre-line" }}>{summary}</p>
          </section>
          <Card>
            <p className="text-sm text-muted" style={{ whiteSpace: "pre-line" }}>{body}</p>
          </Card>

          {contract.status !== "fully_signed" ? (
            <Card>
              <h2 className="mb-2 font-bold">{strings.signTitle}</h2>
              <div className="mb-2 flex gap-2" role="group" aria-label="role">
                {(["customer", "pro"] as const).map((r) => (
                  <Button key={r} variant={role === r ? "primary" : "secondary"} onPress={() => setRole(r)}>{r}</Button>
                ))}
              </div>
              <Field label={strings.signerName}>
                <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </Field>
              <Field label={strings.emailLabel}>
                <Input id="semail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" maxLength={200} />
              </Field>
              <Button variant="secondary" loading={busy} isDisabled={!email} onPress={requestCode} className="mt-2">
                {strings.sendCode}
              </Button>
              {codeSent && <p className="mt-1 text-sm text-muted" role="status">{strings.demoCode}: <strong className="font-mono">{codeSent}</strong></p>}
              <Field label={strings.drawLabel}>
                <canvas
                  id="sdraw"
                  ref={canvasRef}
                  width={320}
                  height={120}
                  className="w-full touch-none rounded-input border border-blueprint bg-surface"
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={() => (drawing.current = false)}
                  onTouchStart={startDraw}
                  onTouchMove={moveDraw}
                  onTouchEnd={() => (drawing.current = false)}
                />
              </Field>
              <Field label={strings.codeLabel}>
                <Input id="scode" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
              </Field>
              <Button size="lg" variant="accent" loading={busy} isDisabled={!name || !code} onPress={sign}>
                {strings.signButton}
              </Button>
            </Card>
          ) : (
            <Card>
              <p className="flex items-center gap-2 font-bold text-verified"><DrawCheck size={28} /> {strings.signedBoth}</p>
              <Button variant="secondary" onPress={downloadPdf} className="mt-2">{strings.downloadPdf}</Button>
              {pdf && <p className="mt-1 font-mono text-xs text-muted">SHA-256: {pdf.slice(0, 32)}…</p>}
              <div className="mt-2">
                <a className="inline-flex items-center justify-center gap-2 rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-soft hover:brightness-125" href={`/book/${contract.job_id}`}>{strings.continueBooking}</a>
              </div>
            </Card>
          )}

          {changes.length > 0 && (
            <Card>
              <h2 className="font-bold">{strings.changeOrders}</h2>
              <ul className="mt-1 space-y-1 text-sm">{changes.map((c) => <li key={c.id}>{c.scope_delta} · +${c.price_delta_usd} · {c.status}</li>)}</ul>
            </Card>
          )}
          <p className="mt-2 text-xs text-muted">{strings.aiTemplateNote}</p>
          {changes.length === 0 && contract.status === "draft" && <EmptyState title={strings.changeOrders} hint={strings.aiTemplateNote} />}
          <FlowNav backHref={`/jobs/${jobId}`} backLabel={strings.back} />
        </>
      )}
    </main>
  );
}
