"use client";

/* U4 Equipo: team roster + add members by pro id. */

import { useEffect, useState } from "react";
import { Avatar, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

interface Company {
  id: string;
  name: string;
}

interface Member {
  id: string;
  proId: string;
  proName?: string;
  role: string;
}

export default function EquipoPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [active, setActive] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [proId, setProId] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const strings = t(lang);

  async function loadMembers(companyId: string) {
    try {
      const res = await fetch(`/api/companies/members?companyId=${encodeURIComponent(companyId)}`);
      if (res.ok) setMembers(((await res.json()) as { members?: Member[] }).members ?? []);
    } catch {
      /* offline */
    }
  }

  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
    (async () => {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const j = (await res.json()) as { companies?: Company[] };
          setCompanies(j.companies ?? []);
          if (j.companies?.length) {
            setActive(j.companies[0].id);
            loadMembers(j.companies[0].id);
          }
        }
      } catch {
        /* offline */
      }
    })();
  }, []);

  async function add() {
    if (!active || proId.trim().length < 1) {
      setError(strings.errorGeneric);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/companies/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: active, proId: proId.trim(), role }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? strings.errorGeneric);
      setProId("");
      await loadMembers(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold">{strings.teamTitle}</h1>
      {companies.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setActive(c.id); loadMembers(c.id); }}
              className={`whitespace-nowrap rounded-btn border px-4 py-2 text-sm font-bold ${active === c.id ? "border-signal bg-ink text-bg" : "border-line bg-surface"}`}
              aria-pressed={active === c.id}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="err mb-3" role="alert">{error}</p>}
      {members.length === 0 && <EmptyState title={strings.teamTitle} hint={strings.teamEmpty} />}
      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center gap-2">
              <Avatar name={m.proName ?? m.proId} />
              <div>
                <div className="font-bold">{m.proName ?? m.proId}</div>
                <div className="text-xs text-muted">{m.proId} · {m.role}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {active && (
        <Card>
          <h2 className="mb-2 font-bold">{strings.addMember}</h2>
          <Field label={strings.proIdPh}>
            <Input value={proId} onChange={(e) => setProId(e.target.value)} maxLength={100} />
          </Field>
          <Select
            label={strings.assignTo}
            selectedKey={role}
            onSelectionChange={(k) => setRole(String(k))}
            items={[{ id: "member", label: "member" }, { id: "dispatcher", label: "dispatcher" }, { id: "owner", label: "owner" }]}
          />
          <Button variant="accent" loading={busy} onPress={add} className="mt-2">
            {strings.addMember}
          </Button>
        </Card>
      )}
    </div>
  );
}
