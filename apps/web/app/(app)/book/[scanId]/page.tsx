"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { BottomSheet, FlowNav } from "@/components/ui";

const ProMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <div className="card skel" />,
});

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
  const [pendingOrder, setPendingOrder] = useState<{ jobId: string; orderId: string; amountUsd: number; sandbox?: boolean } | null>(null);
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ pro_id: string; lat?: number; lng?: number; name?: string; rating?: number }[]>([]);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId }),
        });
        const json = (await res.json()) as { top3?: Pro[]; coords?: { pro_id: string; lat?: number; lng?: number; name?: string; rating?: number }[]; lang?: Lang; error?: string };
        if (!res.ok || !json.top3) throw new Error(json.error ?? "match_failed");
        setPros(json.top3);
        setCoords(json.coords ?? []);
        setSelected(json.top3[0]?.pro_id ?? null);
        setSlot(json.top3[0]?.slots[0] ?? "");
        // S2: AI slot suggestions get a star.
        try {
          const s = await fetch("/api/calendar/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scanId }),
          });
          const sj = (await s.json()) as { slots?: { slot: string }[] };
          if (s.ok && sj.slots) setSuggested(new Set(sj.slots.map((x) => x.slot)));
        } catch {
          /* suggestions are a bonus, not a blocker */
        }
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
      const json = (await res.json()) as Receipt & {
        error?: string;
        provider?: string;
        order?: { orderId: string };
        sandbox?: boolean;
      };
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
      if (json.provider === "paypal" && json.order) {
        // PayPal escrow: buyer approves in the PayPal UI, server authorizes after.
        setPendingOrder({ jobId: json.jobId, orderId: json.order.orderId, amountUsd: json.amountUsd, sandbox: json.sandbox });
      } else {
        setReceipt(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function approvePayPal() {
    if (!pendingOrder) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pay/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: pendingOrder.jobId, orderId: pendingOrder.orderId }),
      });
      const json = (await res.json()) as { error?: string; job?: Receipt };
      if (!res.ok) throw new Error(strings.errorGeneric);
      const r = json.job as unknown as Receipt;
      setReceipt({ ...r, mock: pendingOrder.sandbox ?? true });
      setPendingOrder(null);
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
        <FlowNav backHref={`/quote/${scanId}`} backLabel={strings.back} continueHref={`/jobs/${receipt.jobId}`} continueLabel={strings.watchTitle} />
      </main>
    );
  }

  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{strings.matchTitle}</h1>
      <p className="text-slate2">{strings.matchSub}</p>

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

      {pros && pros.length > 0 && (
        <ProMap points={pros.map((p) => {
          const c = coords.find((x) => x.pro_id === p.pro_id);
          return { id: p.pro_id, lat: c?.lat, lng: c?.lng, label: c?.name ?? p.pro_id };
        })} />
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
                      <option key={s} value={s}>{suggested.has(s) ? `★ ${s}` : s}</option>
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
          {pendingOrder && (
            <BottomSheet>
              <PayPalCheckout order={pendingOrder} busy={busy} onApprove={approvePayPal} />
            </BottomSheet>
          )}
        </>
      )}
      <FlowNav backHref={`/quote/${scanId}`} backLabel={strings.back} />
    </main>
  );
}

function PayPalCheckout({
  order,
  busy,
  onApprove,
}: {
  order: { jobId: string; orderId: string; amountUsd: number; sandbox?: boolean };
  busy: boolean;
  onApprove: () => void;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId || (window as unknown as { paypal?: unknown }).paypal) {
      setSdkReady(Boolean((window as unknown as { paypal?: unknown }).paypal));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&intent=authorize&currency=USD`;
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
  }, []);

  useEffect(() => {
    if (!sdkReady) return;
    const paypal = (window as unknown as { paypal?: { Buttons(o: unknown): { render(el: string): void } } }).paypal;
    paypal?.Buttons({
      createOrder: () => order.orderId,
      onApprove: () => onApprove(),
    }).render("#paypal-buttons");
  }, [sdkReady, order.orderId, onApprove]);

  return (
    <section className="card highlight">
      <div className="muted small">
        {order.sandbox ?? true ? "Prueba / Sandbox — no real charge" : "PayPal"} · ${order.amountUsd} · order {order.orderId.slice(0, 12)}…
      </div>
      <div id="paypal-buttons" />
      {!sdkReady && (
        <button type="button" className="btn big" disabled={busy} onClick={onApprove}>
          {busy ? "…" : "Approve hold (demo)"}
        </button>
      )}
      <FundLink jobId={order.jobId} />
    </section>
  );
}

function FundLink({ jobId }: { jobId: string }) {
  const [link, setLink] = useState<{ url?: string; whatsapp?: string }>({});
  const strings = t(useLang());
  async function create() {
    const res = await fetch("/api/funding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const json = (await res.json()) as { link?: { url: string; whatsapp: string } };
    if (res.ok && json.link) setLink(json.link);
  }
  if (link.url) {
    return (
      <p className="text-sm mt-2 break-all">
        <a className="underline" href={link.whatsapp} target="_blank" rel="noreferrer">{strings.shareVia}</a>
        <br />
        <span className="text-xs text-slate2">{link.url}</span>
      </p>
    );
  }
  return (
    <button type="button" className="btn btn-secondary mt-2" onClick={create}>
      {strings.askRelative}
    </button>
  );
}

function useLang() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);
  return lang;
}
