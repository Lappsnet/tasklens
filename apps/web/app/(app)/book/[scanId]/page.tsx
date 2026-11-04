"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, BottomSheet, Button, Card, FlowNav, Select, Skeleton } from "@/components/ui";
import { StampSeal } from "@/components/blueprint";

const ProMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <Skeleton className="h-28" />,
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
          body: JSON.stringify({ scanId, lang }),
        });
        const json = (await res.json()) as { top3?: Pro[]; coords?: { pro_id: string; lat?: number; lng?: number; name?: string; rating?: number }[]; lang?: Lang; error?: string };
        if (!res.ok || !json.top3) {
          if (json.error === "scan_not_found") throw new Error(strings.errorScanExpired);
          if (json.error === "no_pros") throw new Error(strings.errorNoPros);
          throw new Error(strings.errorGeneric);
        }
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
          json.error === "unauthorized"
            ? strings.errorLoginFirst
            : json.error === "confirmation_required"
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
        <h1 className="font-display text-4xl font-extrabold tracking-tight">✓ {strings.held}</h1>
        <p><Badge status={strings.testBadge} /></p>
        <Card className="border-signal shadow-lifted pop-in mt-4">
          <StampSeal text={strings.held} />
          <div className="mt-3 font-display text-3xl font-extrabold tabular-nums">${receipt.amountUsd} held</div>
          <p className="text-sm text-muted">job {receipt.jobId}</p>
          <p className="text-sm text-muted">{receipt.slot} · payment {receipt.payment.piId} ({receipt.payment.status})</p>
        </Card>
        <p className="mt-3 max-w-[60ch] text-[15px] text-muted">{strings.confirmNote}</p>
        <FlowNav backHref={`/quote/${scanId}`} backLabel={strings.back} continueHref={`/jobs/${receipt.jobId}`} continueLabel={strings.watchTitle} />
      </main>
    );
  }

  return (
    <main>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.matchTitle}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-slate2">{strings.matchSub}</p>

      {error && (
        <p role="alert" className="rounded-btn border border-[#fecdca] bg-[#fef3f2] px-3 py-2.5 text-[#b42318]">
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>{strings.retry}</button>
        </p>
      )}

      {!pros && !error && (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </>
      )}

      {pros && pros.length > 0 && (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[5fr_7fr]">
          <div className="lg:sticky lg:top-24">
            <ProMap points={pros.map((p) => {
              const c = coords.find((x) => x.pro_id === p.pro_id);
              return { id: p.pro_id, lat: c?.lat, lng: c?.lng, label: c?.name ?? p.pro_id };
            })} />
          </div>
          <div role="radiogroup" aria-label={strings.matchTitle} className="stagger space-y-3">
            {pros.map((p) => {
              const c = coords.find((x) => x.pro_id === p.pro_id);
              const rating = c?.rating ?? 4.8;
              return (
              <button
                key={p.pro_id}
                type="button"
                role="radio"
                aria-checked={selected === p.pro_id}
                onClick={() => pick(p.pro_id)}
                className={`w-full rounded-card border bg-surface p-4 text-left shadow-soft transition-shadow hover:shadow-lifted ${selected === p.pro_id ? "border-signal shadow-lifted pop-in" : "border-line"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    role="img"
                    aria-label={`rating ${rating}`}
                    className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
                    style={{ background: `conic-gradient(var(--verified) ${(rating / 5) * 100}%, var(--line) 0)` }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface font-display text-sm font-extrabold">
                      {(c?.name ?? p.pro_id).slice(0, 1).toUpperCase()}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate">{c?.name ?? p.reason}</strong>
                    <span className="font-mono text-xs font-semibold text-[var(--verified)] tabular-nums">★ {rating.toFixed(1)}</span>
                    <div className="text-sm text-muted">
                      {strings.eta(p.eta_days)} · <span className="font-mono font-bold text-ink tabular-nums">${p.quote_usd}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{p.reason}</p>
                  </div>
                </div>
                {selected === p.pro_id && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-3">
                    <Select
                      label={strings.slotLabel}
                      aria-label={strings.slotLabel}
                      selectedKey={slot || (p.slots[0] ?? "")}
                      onSelectionChange={(k) => setSlot(String(k))}
                      items={p.slots.map((s) => ({ id: s, label: suggested.has(s) ? `★ ${s}` : s }))}
                    />
                  </div>
                )}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {pros && pros.length > 0 && (
        <>
          <p className="mt-4 max-w-[60ch] text-[15px] text-muted">{strings.confirmNote}</p>
          <Button size="lg" variant="accent" loading={busy} isDisabled={!selected || !slot} onPress={confirm}>
            {strings.confirm}
          </Button>
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
    <Card className="border-signal shadow-lifted">
      <div className="text-sm text-muted">
        {order.sandbox ?? true ? "Prueba / Sandbox — no real charge" : "PayPal"} · ${order.amountUsd} · order {order.orderId.slice(0, 12)}…
      </div>
      <div id="paypal-buttons" />
      {!sdkReady && (
        <Button size="lg" disabled={busy} onPress={onApprove}>
          {busy ? "…" : "Approve hold (demo)"}
        </Button>
      )}
      <FundLink jobId={order.jobId} />
    </Card>
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
    <Button variant="secondary" className="mt-2" onPress={create}>
      {strings.askRelative}
    </Button>
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
