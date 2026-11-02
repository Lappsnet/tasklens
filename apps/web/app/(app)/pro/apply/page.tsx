"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { useEffect } from "react";
import { Button, Card, ErrorState, Field, FlowNav, Input, Select } from "@/components/ui";

const TRADES = ["plumbing", "electrical", "appliance", "drywall_paint", "assembly", "cleaning"] as const;

/** P1: public pro application — name, trade, zone, phone, rate, ID photo. */
export default function ApplyPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
    if (!name.trim() || !email.trim() || !zone.trim() || !phone.trim()) {
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
      fd.append("email", email.trim());
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
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{strings.applyTitle}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-muted">{strings.applySub}</p>
      {done ? (
        <Card className="border-signal shadow-lifted"><p role="status" className="font-bold text-verified">✓ {strings.applyDone}</p></Card>
      ) : (
        <Card>
          <Field label={strings.proName}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
          <Field label={strings.emailLabel}>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} inputMode="email" placeholder="tu@correo.com" />
          </Field>
          <Select
            label={strings.tradeLabel}
            selectedKey={category}
            onSelectionChange={(k) => setCategory(String(k))}
            items={TRADES.map((c) => ({ id: c, label: c.replace("_", " ") }))}
          />
          <Field label={strings.zoneLabel}>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder={strings.zonePh} maxLength={120} />
          </Field>
          <Field label={strings.phoneLabel}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={strings.phonePh} maxLength={30} inputMode="tel" />
          </Field>
          <Field label={strings.rateLabel}>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" maxLength={3} />
          </Field>
          <Field label={strings.idPhotoLabel}>
            <p className="text-sm text-muted">{strings.idPhotoHint}</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </Field>
          {error && <ErrorState message={error} onRetry={() => { setError(""); void submit(); }} />}
          <Button size="lg" disabled={busy} onPress={submit} className="mt-2">
            {busy ? "…" : strings.applySubmit}
          </Button>
        </Card>
      )}
      <a className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-btn border border-ink bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-bg" href="/login">{strings.existingPro}</a>
      <FlowNav backHref="/" backLabel={strings.back} />
    </main>
  );
}
