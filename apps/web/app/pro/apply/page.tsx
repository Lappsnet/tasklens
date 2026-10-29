"use client";

import { useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { useEffect } from "react";

const TRADES = ["plumbing", "electrical", "appliance", "drywall_paint", "assembly", "cleaning"] as const;

/** P1: public pro application — name, trade, zone, phone, rate, ID photo. */
export default function ApplyPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("plumbing");
  const [zone, setZone] = useState("");
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState("40");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const strings = t(lang);

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  async function submit() {
    if (!name.trim() || !zone.trim() || !phone.trim()) {
      setError(strings.errorGeneric);
      return;
    }
    if (!photo) {
      setError(strings.needIdPhoto);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("category", category);
      fd.append("zone", zone.trim());
      fd.append("phone", phone.trim());
      fd.append("rate_usd_hr", String(Number(rate) || 40));
      fd.append("idPhoto", photo, photo.name);
      const res = await fetch("/api/pros/apply", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? strings.errorGeneric);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>{strings.applyTitle}</h1>
      <p className="muted">{strings.applySub}</p>
      {done ? (
        <p className="card highlight" role="status">✓ {strings.applyDone}</p>
      ) : (
        <section className="card">
          <label className="lbl">{strings.proName}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <label className="lbl">{strings.tradeLabel}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {TRADES.map((c) => (
              <option key={c} value={c}>{c.replace("_", " ")}</option>
            ))}
          </select>
          <label className="lbl">{strings.zoneLabel}</label>
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder={strings.zonePh} maxLength={120} />
          <label className="lbl">{strings.phoneLabel}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={strings.phonePh} maxLength={30} inputMode="tel" />
          <label className="lbl">{strings.rateLabel}</label>
          <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" maxLength={3} />
          <label className="lbl">{strings.idPhotoLabel}</label>
          <p className="muted small">{strings.idPhotoHint}</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {error && <p className="err" role="alert">{error}</p>}
          <button type="button" className="btn big" disabled={busy} onClick={submit}>
            {busy ? "…" : strings.applySubmit}
          </button>
        </section>
      )}
      <Link className="btn btn-secondary" href="/login">{strings.existingPro}</Link>
    </main>
  );
}
