"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

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
      <h1>{strings.queueTitle}</h1>
      <p className="muted">{strings.queueSub}</p>
      <p><Link href="/admin">← {strings.adminTitle}</Link></p>
      <div className="row" role="tablist" aria-label={strings.queueTitle}>
        {(["pending", "approved", "rejected"] as Filter[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className="btn btn-secondary" onClick={() => setFilter(f)}>
            {f} {filter === f && `(${items.length})`}
          </button>
        ))}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {items.length === 0 && <p className="muted">{strings.noApplications}</p>}
      {items.map((a) => (
        <section key={a.id} className="card">
          <div className="row">
            <strong>{a.name}</strong>
            <span className="pill">{a.category.replace("_", " ")} · {a.zone}</span>
          </div>
          <div className="muted small">{a.phone} · ${a.rate_usd_hr}/h · {a.id.slice(0, 8)}</div>
          {a.idPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.idPhotoUrl} alt={`ID — ${a.name}`} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 8 }} />
          )}
          {a.reject_reason && <p className="muted">✕ {a.reject_reason}</p>}
          {filter === "pending" && (
            <>
              <input
                value={reasons[a.id] ?? ""}
                onChange={(e) => setReasons((r) => ({ ...r, [a.id]: e.target.value }))}
                placeholder={strings.rejectReasonPh}
                maxLength={500}
                aria-label={strings.rejectReasonPh}
              />
              <div className="row">
                <button type="button" className="btn" disabled={busy === a.id} onClick={() => decide(a.id, true)}>
                  ✓ {strings.approve}
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy === a.id} onClick={() => decide(a.id, false)}>
                  ✕ {strings.reject}
                </button>
              </div>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
