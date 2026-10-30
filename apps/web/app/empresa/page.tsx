"use client";

/* U4 Empresa panel: companies, team strip, dispatch queue, revenue. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Skeleton } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

interface Company {
  id: string;
  name: string;
  zone: string;
  role: string;
}

interface Member {
  id: string;
  proId: string;
  proName?: string;
  role: string;
}

interface Job {
  id: string;
  status: string;
  price_usd: number;
  pro_id: string;
  company_id?: string | null;
}

export default function EmpresaPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [active, setActive] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [queue, setQueue] = useState<Job[]>([]);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState<Record<string, string>>({});
  const strings = t(lang);

  async function load() {
    try {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error();
      const j = (await res.json()) as { companies?: Company[] };
      setCompanies(j.companies ?? []);
      if (!active && (j.companies ?? []).length > 0) setActive((j.companies as Company[])[0]);
    } catch {
      setCompanies([]);
    }
  }

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        const [m, q, p] = await Promise.all([
          fetch(`/api/companies/members?companyId=${encodeURIComponent(active.id)}`),
          fetch("/api/jobs?status=booked").then(async (r) => (r.ok ? fetch("/api/jobs?status=quoted") : r)).catch(() => null),
          fetch("/api/payouts"),
        ]);
        if (m.ok) setMembers(((await m.json()) as { members?: Member[] }).members ?? []);
        if (q && q.ok) {
          const booked = ((await q.json()) as { jobs?: Job[] }).jobs ?? [];
          setQueue(booked.filter((j) => !j.company_id && ["quoted", "booked"].includes(j.status)));
        }
        if (p.ok) {
          const rows = ((await p.json()) as { payouts?: { amount_usd: number }[] }).payouts ?? [];
          setRevenue(rows.reduce((s, r) => s + r.amount_usd, 0));
        }
      } catch {
        /* offline */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  async function create() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), zone: zone.trim() }),
      });
      if (!res.ok) throw new Error();
      setName("");
      setZone("");
      await load();
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function dispatch(jobId: string) {
    const proId = assigning[jobId];
    if (!proId || !active) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/companies/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, companyId: active.id, proId }),
      });
      if (!res.ok) throw new Error();
      setQueue((qs) => qs.filter((j) => j.id !== jobId));
    } catch {
      setError(strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold">{strings.empresaTitle}</h1>
      <p className="mb-3 text-sm text-muted">{strings.empresaSub}</p>
      {error && <p className="err mb-3" role="alert">{error}</p>}

      {companies === null && <Skeleton className="h-24" />}
      {companies !== null && companies.length === 0 && (
        <Card>
          <h2 className="mb-2 font-bold">{strings.newCompany}</h2>
          <Field label={strings.companyNamePh}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
          <Button variant="accent" loading={busy} onPress={create} className="mt-2">
            {strings.createCompany}
          </Button>
        </Card>
      )}

      {companies !== null && companies.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c)}
              className={`whitespace-nowrap rounded-btn border px-4 py-2 text-sm font-bold ${active?.id === c.id ? "border-signal bg-ink text-bg" : "border-line bg-surface"}`}
              aria-pressed={active?.id === c.id}
            >
              {c.name} · {c.role}
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          <h2 className="mb-2 mt-4 font-display text-lg font-bold">{strings.teamTitle}</h2>
          {members.length === 0 && <EmptyState title={strings.teamTitle} hint={strings.teamEmpty} />}
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
                <Avatar name={m.proName ?? m.proId} size={24} />
                {m.proName ?? m.proId} · {m.role}
              </span>
            ))}
          </div>
          <Link href="/empresa/equipo" className="mt-2 inline-block text-sm font-bold underline">{strings.addMember}</Link>

          <h2 className="mb-2 mt-5 font-display text-lg font-bold" id="dispatch">{strings.dispatchTitle}</h2>
          {queue.length === 0 && <EmptyState title={strings.dispatchTitle} hint={strings.queueEmpty} />}
          {queue.map((j) => (
            <Card key={j.id}>
              <div className="flex items-center justify-between gap-2">
                <strong>job {j.id.slice(0, 8)}…</strong>
                <Badge status={j.status} />
              </div>
              <div className="mt-1 text-sm text-muted">${j.price_usd}</div>
              <div className="mt-2 flex gap-2">
                <select
                  aria-label={strings.assignTo}
                  value={assigning[j.id] ?? ""}
                  onChange={(e) => setAssigning((a) => ({ ...a, [j.id]: e.target.value }))}
                  className="flex-1 rounded-input border border-line bg-surface px-3 py-2.5"
                >
                  <option value="">{strings.assignTo}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.proId}>{m.proName ?? m.proId} · {m.role}</option>
                  ))}
                </select>
                <Button loading={busy} isDisabled={!assigning[j.id]} onPress={() => dispatch(j.id)}>
                  {strings.assignedOk}
                </Button>
              </div>
            </Card>
          ))}

          {revenue !== null && (
            <Card>
              <h2 className="font-bold">{strings.revenueTitle}</h2>
              <div className="font-display text-3xl font-extrabold">${revenue}</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
