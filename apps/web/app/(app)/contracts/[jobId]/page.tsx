"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { FlowNav } from "@/components/ui";

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
      <h1>{strings.contractTitle}</h1>
      {error && <p className="err" role="alert">{error}</p>}
      {!contract && !error && <div className="card skel" />}
      {contract && (
        <>
          <section className="card highlight">
            <div className="muted small">{contract.title} · <span className="pill">{contract.status}</span></div>
            <div className="price">${contract.price_usd}</div>
            <p className="muted small" style={{ whiteSpace: "pre-line" }}>{summary}</p>
          </section>
          <section className="card">
            <p className="muted small" style={{ whiteSpace: "pre-line" }}>{body}</p>
          </section>

          {contract.status !== "fully_signed" ? (
            <section className="card">
              <h2>{strings.signTitle}</h2>
              <div className="row">
                {(["customer", "pro"] as const).map((r) => (
                  <button key={r} type="button" className={`btn ${role === r ? "" : "btn-secondary"}`} onClick={() => setRole(r)}>{r}</button>
                ))}
              </div>
              <label className="lbl" htmlFor="sname">{strings.signerName}</label>
              <input id="sname" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }} />
              <label className="lbl" htmlFor="semail">{strings.emailLabel}</label>
              <input id="semail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }} />
              <button type="button" className="btn btn-secondary" disabled={busy || !email} onClick={requestCode}>{strings.sendCode}</button>
              {codeSent && <p className="muted" role="status">{strings.demoCode}: <strong>{codeSent}</strong></p>}
              <label className="lbl" htmlFor="sdraw">{strings.drawLabel}</label>
              <canvas
                id="sdraw"
                ref={canvasRef}
                width={320}
                height={120}
                style={{ border: "1px solid #ccc", borderRadius: 10, touchAction: "none", width: "100%" }}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={() => (drawing.current = false)}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={() => (drawing.current = false)}
              />
              <label className="lbl" htmlFor="scode">{strings.codeLabel}</label>
              <input id="scode" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }} />
              <button type="button" className="btn big" disabled={busy || !name || !code} onClick={sign}>{busy ? "…" : strings.signButton}</button>
            </section>
          ) : (
            <section className="card">
              <p className="muted">✓ {strings.signedBoth}</p>
              <button type="button" className="btn btn-secondary" onClick={downloadPdf}>{strings.downloadPdf}</button>
              {pdf && <p className="muted small">SHA-256: {pdf.slice(0, 32)}…</p>}
              <div className="row">
                <Link className="btn" href={`/book/${contract.job_id}`}>{strings.continueBooking}</Link>
              </div>
            </section>
          )}

          {changes.length > 0 && (
            <section className="card">
              <h2>{strings.changeOrders}</h2>
              <ul>{changes.map((c) => <li key={c.id}>{c.scope_delta} · +${c.price_delta_usd} · {c.status}</li>)}</ul>
            </section>
          )}
          <p className="muted small">{strings.aiTemplateNote}</p>
          <FlowNav backHref={`/jobs/${jobId}`} backLabel={strings.back} />
        </>
      )}
    </main>
  );
}
