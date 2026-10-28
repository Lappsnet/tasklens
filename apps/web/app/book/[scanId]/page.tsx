"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

interface Pro {
  pro_id: string;
  reason: string;
  eta_days: number;
  quote_usd: number;
  slots: string[];
}

interface Receipt {
  jobId: string;
  proId: string;
  slot: string;
  amountUsd: number;
  payment: { piId: string; status: string };
  mock: boolean;
  testMode: boolean;
}

export default function BookPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = use(params);
  const [lang, setLang] = useState<Lang>("en");
  const [pros, setPros] = useState<Pro[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [slot, setSlot] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId }),
        });
        const json = (await res.json()) as { top3?: Pro[]; lang?: Lang; error?: string };
        if (!res.ok || !json.top3) throw new Error(json.error ?? "match_failed");
        setPros(json.top3);
        setSelected(json.top3[0]?.pro_id ?? null);
        setSlot(json.top3[0]?.slots[0] ?? "");
      } catch {
        setError(strings.errorGeneric);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  function pick(id: string) {
    setSelected(id);
    const p = pros?.find((x) => x.pro_id === id);
    setSlot(p?.slots[0] ?? "");
  }

  async function confirm() {
    if (!selected || !slot) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, proId: selected, slot, confirm: true }),
      });
      const json = (await res.json()) as Receipt & { error?: string };
      if (!res.ok) {
        throw new Error(
          json.error === "confirmation_required"
            ? "confirmation_required"
            : json.error === "pro_not_offered"
              ? "pro_not_offered"
              : json.error === "slot_unavailable"
                ? "slot_unavailable"
                : strings.errorGeneric,
        );
      }
      setReceipt(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <main>
        <h1>✓ {strings.held}</h1>
        <p><span className="pill">{strings.testBadge}</span></p>
        <section className="card highlight">
          <div className="price">${receipt.amountUsd} held</div>
          <p className="muted small">job {receipt.jobId}</p>
          <p className="muted small">{receipt.slot} · payment {receipt.payment.piId} ({receipt.payment.status})</p>
        </section>
        <p className="muted small">{strings.confirmNote}</p>
        <div className="row">
          <Link className="btn btn-secondary" href={`/quote/${scanId}`}>← {strings.quoteTitle}</Link>
          <Link className="btn" href="/scan">{strings.retake}</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>{strings.matchTitle}</h1>
      <p className="muted">{strings.matchSub}</p>

      {error && (
        <p className="err" role="alert">
          {error}{" "}
          <button type="button" className="link" onClick={() => window.location.reload()}>{strings.retry}</button>
        </p>
      )}

      {!pros && !error && (
        <>
          <div className="card skel" />
          <div className="card skel" />
        </>
      )}

      {pros?.length === 0 && <p className="warn">{strings.noPros}</p>}

      {pros && pros.length > 0 && (
        <>
          <div role="radiogroup" aria-label={strings.matchTitle}>
            {pros.map((p) => (
              <label key={p.pro_id} className={`card pro ${selected === p.pro_id ? "highlight" : ""}`}>
                <input
                  type="radio"
                  name="pro"
                  checked={selected === p.pro_id}
                  onChange={() => pick(p.pro_id)}
                />
                <div>
                  <strong>{p.reason}</strong>
                  <div className="muted small">
                    {strings.eta(p.eta_days)} · ${p.quote_usd}
                  </div>
                  <label className="lbl" style={{ marginTop: 8 }} htmlFor={`slot-${p.pro_id}`}>
                    {strings.slotLabel}
                  </label>
                  <select
                    id={`slot-${p.pro_id}`}
                    value={selected === p.pro_id ? slot : p.slots[0] ?? ""}
                    disabled={selected !== p.pro_id}
                    onChange={(e) => setSlot(e.target.value)}
                  >
                    {p.slots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </label>
            ))}
          </div>

          <p className="muted small">{strings.confirmNote}</p>
          <button type="button" className="btn big" disabled={busy || !selected || !slot} onClick={confirm}>
            {busy ? "…" : strings.confirm}
          </button>
        </>
      )}
    </main>
  );
}
