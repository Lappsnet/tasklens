"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";
import { CITIES, findCity, nearestCity } from "@/lib/cities";
import { Button, Card, EmptyState, ErrorState, FlowNav, Skeleton, Badge } from "@/components/ui";

interface Report {
  id: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  status: string;
  sla_due: string;
  duplicate_of: string | null;
  assigned_pro_id: string | null;
  suggested?: { id: string; name: string; rating: number; city?: string }[];
}

function slaLeft(iso: string, lang: Lang): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return lang === "es" ? "SLA vencido" : "SLA breached";
  const h = Math.round(ms / 3600_000);
  return h < 48 ? (lang === "es" ? `vence en ${h}h` : `due in ${h}h`) : lang === "es" ? `vence en ${Math.round(h / 24)}d` : `due in ${Math.round(h / 24)}d`;
}

/** S7: one city's public-issue board. City-fenced: you only ever see your own city. */
export default function CityPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [slug, setSlug] = useState("san-salvador");
  const [role, setRole] = useState("");
  const [opCity, setOpCity] = useState<string | null>(null);
  const [items, setItems] = useState<Report[] | null>(null);
  const [error, setError] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const strings = t(lang);
  const city = findCity(slug) ?? CITIES[0];
  const isOp = (role === "city_operator" && opCity === city.slug) || role === "admin";

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    setSlug(window.localStorage.getItem("tasklens:city") ?? "san-salvador");
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => ({}));
      setRole(me.role ?? "");
      setOpCity(me.city ?? null);
    })();
  }, []);

  async function load(s: string) {
    setItems(null);
    setError("");
    const res = await fetch(`/api/city/reports?city=${encodeURIComponent(s)}`);
    const json = (await res.json()) as { reports?: Report[]; error?: string };
    if (res.ok) setItems(json.reports ?? []);
    else setError(json.error ?? "load_failed");
  }

  useEffect(() => {
    window.localStorage.setItem("tasklens:city", slug);
    load(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function useLocation() {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const c = nearestCity(p.coords.latitude, p.coords.longitude);
        setSlug(c.slug);
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => setError("geo_denied"),
    );
  }

  async function file() {
    if (desc.trim().length < 10) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("city_slug", city.slug);
      form.set("description", desc.trim());
      form.set("lat", String(coords?.lat ?? city.lat));
      form.set("lng", String(coords?.lng ?? city.lng));
      if (photo) form.set("photo", photo);
      const res = await fetch("/api/city/reports", { method: "POST", body: form });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "report_failed");
      setDesc("");
      setPhoto(null);
      await load(slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "report_failed");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/city/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (res.ok) await load(slug);
  }

  return (
    <main>
      <h1 className="font-display text-2xl font-bold">{strings.cityTitle}</h1>
      <p className="text-slate2 text-sm">{strings.citySub}</p>
      <div className="mt-3 flex gap-2">
        <select
          aria-label="city"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          style={{ flex: 1, border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit" }}
        >
          {CITIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}, {c.country}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={useLocation}>{strings.useMyLocation}</Button>
      </div>

      <Card>
        <h2 className="font-bold">{strings.reportIssue}</h2>
        <p className="text-xs text-slate2">{strings.reportPrivacy}</p>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={strings.reportPlaceholder}
          rows={3}
          style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: 10, font: "inherit", marginTop: 8 }}
        />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          style={{ marginTop: 8, font: "inherit" }}
        />
        <Button variant="accent" className="mt-2" disabled={busy || desc.trim().length < 10} onClick={file}>
          {busy ? "…" : strings.sendReport}
        </Button>
      </Card>

      {error && <ErrorState message={error} />}
      {!items && !error && <Skeleton className="h-48" />}
      {items?.length === 0 && <EmptyState title={strings.noReports} hint={strings.noReportsHint} />}
      {items?.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge status={r.severity} />
            <span className="text-xs text-slate2">{r.category} · {r.status} · {slaLeft(r.sla_due, lang)}</span>
          </div>
          <h3 className="font-bold mt-1">{r.title}</h3>
          <p className="text-sm text-slate2">{r.description}</p>
          {r.duplicate_of && <p className="text-xs">↳ {strings.markedDuplicate}</p>}
          {isOp && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {(["assigned", "in_progress", "resolved", "closed"] as const).map((s) => (
                <Button key={s} variant="secondary" onClick={() => act(r.id, { status: s })}>{s}</Button>
              ))}
              {r.suggested?.map((p) => (
                <Button key={p.id} variant="accent" onClick={() => act(r.id, { status: "assigned", assigned_pro_id: p.id })}>
                  {p.name} ★{p.rating}
                </Button>
              ))}
            </div>
          )}
        </Card>
      ))}
      <FlowNav backHref="/" backLabel={strings.back} />
    </main>
  );
}
