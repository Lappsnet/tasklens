"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { Badge, Button, Card, Dialog, DialogTrigger, ErrorState, Field, FlowNav, Input } from "@/components/ui";

interface AppItem {
  id: string;
  name: string;
  category: string;
  zone: string;
  phone: string;
  rate_usd_hr: number;
  status: string;
  reject_reason: string | null;
  idPhotoUrl: string | null;
}

type Filter = "pending" | "approved" | "rejected";

/** P1: admin verification queue — review ID photos, approve or reject. */
export default function AdminProsPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AppItem[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null);
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  async function load(f: Filter) {
    setError("");
    try {
      const res = await fetch(`/api/pros/applications?status=${f}`);
      const json = (await res.json()) as { applications?: AppItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? strings.errorGeneric);
      setItems(json.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/pros/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approve, reason: reasons[id] ?? "" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? strings.errorGeneric);
      await load(filter);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy("");
    }
  }

  return (
    <main>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.queueTitle}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-muted">{strings.queueSub}</p>
      <p><Link href="/admin">← {strings.adminTitle}</Link></p>
      <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label={strings.queueTitle}>
        {(["pending", "approved", "rejected"] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "primary" : "secondary"} aria-selected={filter === f} className="px-3 py-1.5 text-sm" onPress={() => setFilter(f)}>
            {f} {filter === f && `(${items.length})`}
          </Button>
        ))}
      </div>
      {error && <ErrorState message={error} onRetry={() => load(filter)} />}
      {items.length === 0 && <p className="text-sm text-muted">{strings.noApplications}</p>}
      {items.map((a) => (
        <Card key={a.id}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <strong>{a.name}</strong>
            <Badge status={`${a.category.replace("_", " ")} · ${a.zone}`} />
          </div>
          <div className="text-sm text-muted">{a.phone} · ${a.rate_usd_hr}/h · {a.id.slice(0, 8)}</div>
          {a.idPhotoUrl && (
            <button
              type="button"
              onClick={() => setPreview({ src: a.idPhotoUrl as string, name: a.name })}
              className="mt-2 block overflow-hidden rounded-card border border-line outline-none focus-visible:ring-2 focus-visible:ring-signal"
              aria-label={`${strings.queueTitle} — ${a.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.idPhotoUrl} alt={`ID — ${a.name}`} style={{ maxWidth: "100%", borderRadius: 8 }} />
            </button>
          )}
          {a.reject_reason && <p className="text-sm text-muted">✕ {a.reject_reason}</p>}
          {filter === "pending" && (
            <>
              <Field label={strings.rejectReasonPh} className="mt-2">
                <Input
                  value={reasons[a.id] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [a.id]: e.target.value }))}
                  placeholder={strings.rejectReasonPh}
                  maxLength={500}
                  aria-label={strings.rejectReasonPh}
                />
              </Field>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <Button disabled={busy === a.id} onPress={() => decide(a.id, true)}>
                  ✓ {strings.approve}
                </Button>
                <Button variant="secondary" disabled={busy === a.id} onPress={() => decide(a.id, false)}>
                  ✕ {strings.reject}
                </Button>
              </div>
            </>
          )}
        </Card>
      ))}
      <FlowNav backHref="/admin" backLabel={strings.back} />
      <DialogTrigger isOpen={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <span className="hidden" aria-hidden="true" />
        <Dialog title={preview?.name ?? strings.queueTitle}>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.src} alt={`ID — ${preview.name}`} className="max-h-[70vh] w-full rounded-card object-contain" />
          )}
        </Dialog>
      </DialogTrigger>
    </main>
  );
}
